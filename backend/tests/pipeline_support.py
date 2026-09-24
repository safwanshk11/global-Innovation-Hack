"""SQL-backed Supabase-shaped test transport, with isolated in-memory media.

This is only a test adapter. Production always uses the real Supabase client.
"""
import json
import threading
from types import SimpleNamespace
from uuid import UUID
import psycopg
from psycopg import sql
from psycopg.rows import dict_row

class Storage:
    def __init__(self):self.files={};self.lock=threading.Lock();self.fail_upload=False;self.fail_download=False
    def from_(self,bucket):return Bucket(self,bucket)
class Bucket:
    def __init__(self,parent,bucket):self.parent,self.bucket=parent,bucket
    def upload(self,path,data,options=None):
        if self.parent.fail_upload:raise RuntimeError('storage failure')
        with self.parent.lock:self.parent.files[(self.bucket,path)]=data
    def download(self,path):
        if self.parent.fail_download:raise RuntimeError('storage failure')
        return self.parent.files[(self.bucket,path)]
    def remove(self,paths):
        with self.parent.lock:
            for path in paths:self.parent.files.pop((self.bucket,path),None)

class Client:
    def __init__(self,dsn):self.dsn=dsn;self.storage=Storage();self.select_barrier=None;self.fail_insert=False;self.down=False
    def table(self,name):return Query(self,name)
    def rpc(self,name,args):return Rpc(self,name,args)
    def connection(self):
        if self.down:raise RuntimeError('private database details')
        return psycopg.connect(self.dsn,autocommit=True,row_factory=dict_row)
class Rpc:
    def __init__(self,client,name,args):self.client,self.name,self.args=client,name,args
    def execute(self):
        args={k:json.dumps(v) if isinstance(v,(list,dict)) else v for k,v in self.args.items()}
        query=sql.SQL('select {}({}) as result').format(sql.Identifier(self.name),sql.SQL(',').join(sql.SQL('{}=>%s').format(sql.Identifier(k)) for k in args))
        with self.client.connection() as db:result=db.execute(query,list(args.values())).fetchone()['result']
        return SimpleNamespace(data=result)
class Query:
    def __init__(self,client,name):
        self.client,self.name=client,name;self.filters=[];self.params=[];self.columns='*';self.action='select';self.values={};self.start=0;self.end=9999;self.sort=None
    def select(self,columns,count=None):self.columns=columns;return self
    def eq(self,key,value):self.filters.append(sql.SQL('{}=%s').format(sql.Identifier(key)));self.params.append(value);return self
    def in_(self,key,value):self.filters.append(sql.SQL('{}=any(%s)').format(sql.Identifier(key)));self.params.append(value);return self
    def is_(self,key,value):
        assert value=='null';self.filters.append(sql.SQL('{} is null').format(sql.Identifier(key)));return self
    def order(self,key,desc=False):self.sort=(key,desc);return self
    def limit(self,n):self.start=0;self.end=n-1;return self
    def range(self,start,end):self.start=start;self.end=end;return self
    def insert(self,values):self.action='insert';self.values=values;return self
    def update(self,values):self.action='update';self.values=values;return self
    def execute(self):
        where=sql.SQL(' where ')+sql.SQL(' and ').join(self.filters) if self.filters else sql.SQL('')
        params=list(self.params)
        with self.client.connection() as db:
            if self.action=='insert':
                if self.client.fail_insert:raise RuntimeError('insert failed')
                query=sql.SQL('insert into {} ({}) values ({}) returning *').format(sql.Identifier(self.name),sql.SQL(',').join(map(sql.Identifier,self.values)),sql.SQL(',').join([sql.Placeholder()]*len(self.values)))
                rows=db.execute(query,list(self.values.values())).fetchall()
            elif self.action=='update':
                vals=[json.dumps(v) if isinstance(v,(list,dict)) else v for v in self.values.values()]
                query=sql.SQL('update {} set {}').format(sql.Identifier(self.name),sql.SQL(',').join(sql.SQL('{}=%s').format(sql.Identifier(k)) for k in self.values))+where+sql.SQL(' returning *')
                rows=db.execute(query,vals+params).fetchall()
            else:
                receipt='issue_reports(' in self.columns
                if receipt:
                    # Production PostgREST embeds this in one SQL snapshot.
                    cols=self.columns.split(',issue_reports')[0]
                    expression=sql.SQL(',').join(map(sql.Identifier,[c.strip() for c in cols.split(',')]))+sql.SQL(", (select jsonb_agg(jsonb_build_object('issue_id',issue_id,'outcome',outcome)) from issue_reports where report_id=reports.id) as issue_reports")
                else:expression=sql.SQL('*') if self.columns=='*' else sql.SQL(',').join(map(sql.Identifier,[c.strip() for c in self.columns.split(',')]))
                count=db.execute(sql.SQL('select count(*) as n from {}').format(sql.Identifier(self.name))+where,params).fetchone()['n']
                query=sql.SQL('select {} from {}').format(expression,sql.Identifier(self.name))+where
                if self.sort:query+=sql.SQL(' order by {} {}').format(sql.Identifier(self.sort[0]),sql.SQL('desc' if self.sort[1] else 'asc'))
                query+=sql.SQL(' limit %s offset %s');rows=db.execute(query,params+[max(0,self.end-self.start+1),self.start]).fetchall()
        # Normalize dates/UUIDs like PostgREST JSON without returning raw vectors.
        rows=json.loads(json.dumps(rows,default=str))
        if self.action=='select' and self.name=='reports' and self.columns=='id, status' and self.client.select_barrier:
            barrier=self.client.select_barrier
            if not rows:barrier.wait(timeout=5)
        return SimpleNamespace(data=rows,count=count if self.action=='select' else len(rows))
