from types import SimpleNamespace
from uuid import uuid4
import pytest
from contracts import SpeechResult
from repositories.triage import TriageRepository, LostLease

class Client:
    def __init__(self,data=None,error=None): self.data,self.error,self.calls=data,error,[]
    def rpc(self,name,args): self.calls.append((name,args));return self
    def execute(self):
        if self.error: raise self.error
        return SimpleNamespace(data=self.data)

def test_lost_lease_is_safe():
    repo=TriageRepository(Client(error=RuntimeError('db private context: lost_lease')))
    with pytest.raises(LostLease,match='^lost_lease$'): repo.claim()

def test_false_renew_fails():
    with pytest.raises(LostLease): TriageRepository(Client(False)).renew(uuid4(),uuid4())

def test_speech_stage_payload():
    client=Client(True);repo=TriageRepository(client)
    speech=SpeechResult(transcript_original='water leak',transcript_en='water leak',duration_seconds=1.0,speech_model='test')
    repo.save_analysis(uuid4(),uuid4(),speech=speech)
    name,args=client.calls[0]
    assert name=='triage_save_analysis' and args['payload']['transcript_original']=='water leak'
    assert 'embedding' not in args['payload']

def test_finalize_config_passthrough():
    client=Client({'outcome':'created'});repo=TriageRepository(client)
    assert repo.finalize(uuid4(),uuid4(),model='test',revision='rev')['outcome']=='created'
    assert client.calls[0][1]['min_margin']==0.05
