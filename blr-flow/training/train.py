from pathlib import Path
import numpy as np,json,csv,datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error,r2_score
P=Path(__file__).resolve().parents[1];rng=np.random.default_rng(42)
junctions=['Silk Board','Marathahalli Bridge','Hebbal Flyover','KR Puram','Electronic City','MG Road']
# Junction offsets are illustrative assumptions, not measurements.
base=[27,24,22,25,18,15];rows=[]
for d in range(120):
 day=datetime.date(2026,1,1)+datetime.timedelta(days=d);weekend=int(day.weekday()>=5)
 for j in range(6):
  for h in range(24):
   rain=int(rng.random()<.16);event=int(rng.random()<.06)
   morning=np.exp(-((h-9)/2)**2);evening=np.exp(-((h-18)/2.5)**2)
   score=np.clip(base[j]+(36*morning+43*evening)*(1-.35*weekend)+11*rain+8*event-13*int(h<6)+rng.normal(0,4),0,100)
   rows.append([str(day),j,h,weekend,rain,event,float(score)])
def feat(r):return [r[1],np.sin(r[2]*2*np.pi/24),np.cos(r[2]*2*np.pi/24),r[3],r[4],r[5]]
train=[r for r in rows if r[0]<'2026-04-01'];test=[r for r in rows if r[0]>='2026-04-01']
X=np.array([feat(r) for r in train]);y=np.array([r[-1] for r in train]);xt=np.array([feat(r) for r in test]);yt=np.array([r[-1] for r in test])
m=RandomForestRegressor(n_estimators=24,max_depth=8,min_samples_leaf=5,random_state=42,n_jobs=-1).fit(X,y);pred=m.predict(xt)
trees=[]
for est in m.estimators_:
 t=est.tree_;trees.append({'left':t.children_left.tolist(),'right':t.children_right.tolist(),'feature':t.feature.tolist(),'threshold':t.threshold.tolist(),'value':t.value[:,0,0].tolist()})
metrics={'mae':mean_absolute_error(yt,pred),'r2':r2_score(yt,pred),'residual90':float(np.quantile(np.abs(yt-pred),.9)),'train_rows':len(train),'test_rows':len(test),'split':'Chronological: January-March train, April test. Synthetic only.'}
(P/'models/model.json').write_text(json.dumps({'kind':'random-forest-regression','trees':trees,'junctions':junctions,'features':['junction_index','hour_sin','hour_cos','weekend','rain','event'],'importance':m.feature_importances_.tolist(),'metrics':metrics,'seed':42,'dataset':'Synthetic hourly congestion indices. No live or measured Bengaluru data.'}))
with (P/'data/synthetic-traffic.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['date','junction_index','hour','weekend','rain','event','congestion_index']);w.writerows(rows)
print(metrics)

samples=[[0,0,1,0,0,0],[3,1,0,1,1,0],[5,-1,0,0,1,1]]
(P/'tests/parity.json').write_text(json.dumps([{'features':f,'expected':float(m.predict([f])[0])} for f in samples]))
