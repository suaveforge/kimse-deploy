import json,os,time,uuid,datetime,urllib.request,urllib.error
API='https://api-kimse.suaveforge.com'
def call(path,method='GET',data=None,token=None):
    headers={'Accept':'application/json','Content-Type':'application/json'}
    if token:headers['X-KIMSE-ACCOUNT-TOKEN']=token
    payload=json.dumps(data).encode() if data is not None else None
    req=urllib.request.Request(API+path,data=payload,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=25) as res:
            content=res.read(100000).decode('utf-8')
            return res.status,json.loads(content)
    except urllib.error.HTTPError as e:
        msg=e.read(1200).decode('utf-8','replace')
        raise RuntimeError('HTTP '+str(e.code)+' '+path+' '+msg[:250])
def main():
    result={'test_type':'ISOLATED_SYNTHETIC_ONLY','api':API,'write_to_production':True,'checks':[]}
    status,health=call('/health')
    assert status==200 and health.get('ok') and health.get('storage')=='sqlite'
    result['checks'].append({'name':'API_HEALTH','status':'PASS','storage':health['storage']})
    tag='QA_AUTOCOLLECT_'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:7]
    status,user=call('/api/v1/auth/signup','POST',{'display_name':tag,'email':tag.lower()+'@example.invalid'})
    assert status in (200,201)
    aid=user['id'];token=user['access_token']
    result['checks'].append({'name':'QA_ACCOUNT_ISOLATED','status':'PASS'})
    status,subject=call('/api/v1/subjects/self','POST',{'account_id':aid},token)
    assert status in (200,201)
    sid=subject['care_subject_id']
    status,start=call('/api/v1/subjects/'+sid+'/monitoring/start','POST',{'account_id':aid},token)
    assert start.get('baseline_started_at')
    result['checks'].append({'name':'MONITORING_STARTED','status':'PASS'})
    now=datetime.datetime.now(datetime.timezone.utc)
    localday=(now+datetime.timedelta(hours=9)).strftime('%Y-%m-%d')
    metrics=[
      ('steps',643,'count'),('location_radius_m',225,'m'),('outings',1,'count'),
      ('movement_distance_m',850,'m'),('motion_active_minutes',24,'min'),
      ('app_active_minutes',12,'min'),('app_sessions',1,'count'),
      ('sleep_minutes',445,'min'),('voice_pause_ratio',0.12,'ratio'),
      ('call_count',1,'count')
    ]
    events=[{'client_event_id':'qa-'+uuid.uuid4().hex,'source':'qa_synthetic','metric':metric,'value':value,'unit':unit,'observed_at':(now-datetime.timedelta(seconds=i)).isoformat(),'metadata':{'local_day':localday,'test_record':True,'source_label':'QA_SYNTHETIC_NOT_REAL_SENSOR'}} for i,(metric,value,unit) in enumerate(metrics)]
    status,ingest=call('/api/v1/subjects/'+sid+'/signals/batch','POST',{'account_id':aid,'events':events},token)
    assert status==200 and ingest.get('inserted')==len(events),(status,ingest.get('inserted'),len(events))
    result['checks'].append({'name':'EVENTS_SAVED','status':'PASS','inserted':ingest['inserted']})
    status,coverage=call('/api/v1/subjects/'+sid+'/monitoring/coverage?account_id='+aid+'&days=28',token=token)
    got={m['metric']:m for m in coverage.get('metrics',[])}
    assert all(m in got for m,_,_ in metrics),list(got)
    assert all(got[m]['sources'][0]['source']=='qa_synthetic' for m,_,_ in metrics)
    result['checks'].append({'name':'READ_BACK_COVERAGE','status':'PASS','metrics':len(got),'sources_are_synthetic':True,'observed_days':coverage['observed_days']})
    status,summary=call('/api/v1/subjects/'+sid+'/monitoring/summary?account_id='+aid,token=token)
    assert summary.get('status')=='LEARNING' and summary.get('baseline_days',0)>=1
    result['checks'].append({'name':'BASELINE_NOT_FAKE_READY','status':'PASS','summary_status':summary['status']})
    # Do not rerun insertions: no cleanup endpoint and every test record is tagged.
    result['status']='PASS'
    result['limitations']='Synthetic single-day ingestion proves server read/write only, not real phone sampling, actual user history or 14-day continuity.'
    os.makedirs('qa-artifacts/api-monitoring',exist_ok=True)
    with open('qa-artifacts/api-monitoring/result.json','w') as f:json.dump(result,f,ensure_ascii=False,indent=2)
    print('KIMSE_API_TEST_PASS '+json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
