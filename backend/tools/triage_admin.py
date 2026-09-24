"""List processing state or explicitly requeue one eligible report."""
import argparse
import json
from uuid import UUID
from settings import load_environment
from repositories.reports import ReportsRepository

def main():
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='command',required=True)
    sub.add_parser('list');retry=sub.add_parser('retry');retry.add_argument('--report-id',type=UUID,required=True)
    args=p.parse_args();load_environment()
    try:
        from supabase_client import get_supabase_client
        repo=ReportsRepository(get_supabase_client())
        result=repo.operator_list() if args.command=='list' else {'report_id':str(args.report_id),'outcome':repo.retry(args.report_id)}
    except Exception:
        print(json.dumps({'error':'database_unavailable_or_schema_missing'}));return 1
    print(json.dumps(result,indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
