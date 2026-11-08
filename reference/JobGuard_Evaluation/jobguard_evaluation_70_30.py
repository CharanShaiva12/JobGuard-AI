"""JobGuard AI: four pipeline evaluation at 70:30 only.
Place beside fake_job_postings.csv and PhiUSIIL_Phishing_URL_Dataset.csv.
Run: python jobguard_evaluation_70_30.py

Important: EMSCAD positive class = fraudulent. This script assumes PhiUSIIL's
original numeric label convention is 0=phishing, 1=legitimate, and maps
phishing to positive. It selects the first 18 numeric feature columns after
excluding the target; inspect the printed feature list and verify it matches
the feature set used in your application before reporting results.
"""
from pathlib import Path
import sys, warnings
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

warnings.filterwarnings("ignore")
BASE = Path(__file__).resolve().parent
SEED, TEST_SIZE = 42, 0.30

def get_file(name, prompt):
    p = BASE / name
    if p.exists():
        print("Found dataset:", p.name)
        return p
    p = Path(input(f"Cannot find {name}. {prompt}").strip().strip('"'))
    if not p.exists():
        raise FileNotFoundError(p)
    return p

def col_match(df, names):
    cols = {str(c).strip().lower(): c for c in df.columns}
    return next((cols[n.lower()] for n in names if n.lower() in cols), None)

def labels(series, dataset):
    numeric = pd.to_numeric(series, errors="coerce")
    if numeric.notna().all() and set(numeric.unique()).issubset({0, 1}):
        y = numeric.astype(int).to_numpy()
        if dataset == "PhiUSIIL":
            y = 1 - y  # source convention: 0=phishing, 1=legitimate
            note = "source 0=phishing mapped to positive class 1"
        else:
            note = "1=fraudulent positive class"
        return y, note
    pos = {"fraud", "fraudulent", "fake", "scam", "phishing", "phish", "malicious", "yes", "true"}
    y = np.array([int(str(v).strip().lower() in pos) for v in series])
    return y, "string positive labels mapped to 1"

def evaluate(name, y, pred, score, ntrain):
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0,1]).ravel()
    try:
        auc = roc_auc_score(y, score) * 100
    except ValueError:
        auc = np.nan
    row = {
        "Pipeline": name, "Split": "70:30", "Train records": ntrain, "Test records": len(y),
        "Accuracy (%)": accuracy_score(y,pred)*100,
        "Precision (%)": precision_score(y,pred,zero_division=0)*100,
        "Recall (%)": recall_score(y,pred,zero_division=0)*100,
        "F1-score (%)": f1_score(y,pred,zero_division=0)*100,
        "ROC-AUC (%)": auc, "TN":tn, "FP":fp, "FN":fn, "TP":tp
    }
    print(f"\n{name}")
    for k in ["Accuracy (%)","Precision (%)","Recall (%)","F1-score (%)","ROC-AUC (%)"]:
        print(f"{k}: {row[k]:.2f}%")
    print("Confusion matrix [[TN, FP], [FN, TP]]:")
    print([[int(tn),int(fp)],[int(fn),int(tp)]])
    return row

def run_emscad(path):
    print("\n" + "="*65 + "\nEMSCAD: TF-IDF + Logistic Regression and Linear SVM\n" + "="*65)
    df = pd.read_csv(path, low_memory=False)
    target = col_match(df, ["fraudulent","is_fraudulent","label","target","class","is_fake"])
    if target is None:
        raise ValueError("Could not identify EMSCAD target column. Columns: " + ", ".join(map(str,df.columns)))
    df = df[df[target].notna()].copy()
    y, note = labels(df[target], "EMSCAD")
    print("Target:", target, "|", note)
    text_cols = [c for c in ["title","company_profile","description","requirements","benefits"] if c in df.columns]
    if not text_cols:
        text_cols = [c for c in df.select_dtypes(include=["object","string"]).columns if c != target]
    if not text_cols:
        raise ValueError("No text columns found in EMSCAD.")
    print("Text fields:", ", ".join(map(str,text_cols)))
    text = df[text_cols].fillna("").astype(str).agg(" ".join, axis=1)
    tr, te = train_test_split(np.arange(len(df)), test_size=TEST_SIZE, random_state=SEED, stratify=y)
    vec = TfidfVectorizer(stop_words="english", max_features=50000, ngram_range=(1,2), min_df=2, sublinear_tf=True)
    Xtr, Xte = vec.fit_transform(text.iloc[tr]), vec.transform(text.iloc[te])
    yt, yv = y[tr], y[te]
    print(f"Train={len(tr):,}; Test={len(te):,}; TF-IDF features={Xtr.shape[1]:,}")
    rows=[]
    lr=LogisticRegression(max_iter=2000, random_state=SEED)
    lr.fit(Xtr,yt); pred=lr.predict(Xte); score=lr.predict_proba(Xte)[:,list(lr.classes_).index(1)]
    rows.append(evaluate("EMSCAD — TF-IDF + Logistic Regression",yv,pred,score,len(tr)))
    svm=LinearSVC(max_iter=10000, random_state=SEED)
    svm.fit(Xtr,yt); pred=svm.predict(Xte); score=svm.decision_function(Xte)
    if list(svm.classes_).index(1)==0: score=-score
    rows.append(evaluate("EMSCAD — TF-IDF + Linear SVM",yv,pred,score,len(tr)))
    return rows

def run_phiusiil(path):
    print("\n" + "="*65 + "\nPhiUSIIL: URL features + HistGradientBoosting and Logistic Regression\n" + "="*65)
    df=pd.read_csv(path,low_memory=False)
    target=col_match(df,["label","status","target","class","result","phishing"])
    if target is None:
        raise ValueError("Could not identify PhiUSIIL target column. Columns: "+", ".join(map(str,df.columns)))
    df=df[df[target].notna()].copy()
    y,note=labels(df[target],"PhiUSIIL")
    print("Target:",target,"|",note)
    excluded=("label","target","class","status","result","phishing")
    feats=[c for c in df.select_dtypes(include=[np.number]).columns if c!=target and not any(t in str(c).lower() for t in excluded)]
    if len(feats)>18: feats=feats[:18]
    if not feats: raise ValueError("No numeric URL features found.")
    print(f"Using {len(feats)} numeric URL features:")
    for c in feats: print(" -",c)
    print("VERIFY these are the intended features used by your JobGuard application.")
    X=df[feats].replace([np.inf,-np.inf],np.nan)
    tr,te=train_test_split(np.arange(len(df)),test_size=TEST_SIZE,random_state=SEED,stratify=y)
    Xtr,Xte=X.iloc[tr],X.iloc[te]; yt,yv=y[tr],y[te]
    print(f"Train={len(tr):,}; Test={len(te):,}")
    rows=[]
    hgb=Pipeline([("imputer",SimpleImputer(strategy="median")),("model",HistGradientBoostingClassifier(max_iter=100,learning_rate=.1,random_state=SEED))])
    hgb.fit(Xtr,yt); pred=hgb.predict(Xte); score=hgb.predict_proba(Xte)[:,list(hgb.classes_).index(1)]
    rows.append(evaluate("PhiUSIIL — URL features + HistGradientBoosting",yv,pred,score,len(tr)))
    lr=Pipeline([("imputer",SimpleImputer(strategy="median")),("scaler",StandardScaler()),("model",LogisticRegression(max_iter=2000,random_state=SEED))])
    lr.fit(Xtr,yt); pred=lr.predict(Xte); score=lr.predict_proba(Xte)[:,list(lr.classes_).index(1)]
    rows.append(evaluate("PhiUSIIL — URL features + Logistic Regression",yv,pred,score,len(tr)))
    return rows

def main():
    print("JOBGUARD AI — FOUR PIPELINES, 70:30 SPLIT ONLY")
    try:
        e=get_file("fake_job_postings.csv","Enter full path: ")
        p=get_file("PhiUSIIL_Phishing_URL_Dataset.csv","Enter full path: ")
        rows=run_emscad(e)+run_phiusiil(p)
        out=pd.DataFrame(rows)
        out=out[["Pipeline","Split","Train records","Test records","Accuracy (%)","Precision (%)","Recall (%)","F1-score (%)","ROC-AUC (%)","TN","FP","FN","TP"]]
        dest=BASE/"JobGuard_Results_70_30.csv"
        out.to_csv(dest,index=False)
        print("\n"+"="*120+"\nFINAL RESULTS — FOUR PIPELINES, 70:30\n"+"="*120)
        print(out.round(2).to_string(index=False))
        print("\nSaved:",dest)
        print("Send me the full terminal output and upload JobGuard_Results_70_30.csv.")
    except Exception as ex:
        print("\nERROR:",ex)
        print("Send me the complete error message if execution stops.")
        sys.exit(1)

if __name__=="__main__":
    main()
