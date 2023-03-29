
import gc
from flask import Flask, request
from flask_cors import CORS, cross_origin
from functions import  predict_godel_base, predict_mask,getVector
import jsonpickle
from transformers import  \
    AutoTokenizer,\
    AutoModelForSeq2SeqLM,\
    AutoTokenizer,\
    AutoModel 
    # AutoModelForTokenClassification,BartForConditionalGeneration,BartTokenizer,\
# ========================================================
# loading models
print("loading models and test them") #test both loaded model performance and memory management
test1='My name is Aidan and I live in Berlin.its hard to live here but what can i do ,you know what i mean ,bills have to be paid.so i work hard and not give up and try more no matter what.'
test2='what is my problem?'
print(test1,test2)
# ========================================================
# mask
mask_model='../../models/ask-question-basedOnAContex/mobilebert-uncased'
mask_tokenizer='../../models/ask-question-basedOnAContex/mobilebert-uncased'
print(predict_mask(mask_model,mask_model,['the main problem of the following story is about ','story:'+test1]))
# ========================================================
# dialog
godel_model = AutoModelForSeq2SeqLM.from_pretrained("../../models/dialog/godel-base")
godel_tokenizer = AutoTokenizer.from_pretrained("../../models/dialog/godel-base")
print('predict_godel_base',predict_godel_base(test1,godel_model,godel_tokenizer) )
# ========================================================
# semanticSearch
semanticSearch_tokenizer = AutoTokenizer.from_pretrained('../../models/semantic-search/all-MiniLM-L6-v2')
semanticSearch_model = AutoModel.from_pretrained('../../models/semantic-search/all-MiniLM-L6-v2')
# ========================================================
vectorSize=384 #todo:load configs from the same place as Deno(like configs.json)
# ========================================================
print("starting the python proxy server...")
app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'
@app.route("/", methods=['POST'])
@cross_origin()
def get_gen():
    global configs
    data = request.get_json()
    functionName=data['functionName']
    output='' 

    if(functionName=='predict_godel_base'):output=predict_godel_base(data['param'],godel_model,godel_tokenizer,vectorSize) 
    if(functionName=='getVector'):output=getVector(semanticSearch_tokenizer,semanticSearch_model,data['param'])
    if(functionName=='predict_mask'):output=predict_mask(mask_tokenizer,mask_model,data['param'])

    res=jsonpickle.decode(jsonpickle.encode({'result': output}, unpicklable=False))
    gc.collect()
    return res

if __name__ == '__main__': app.run(host='0.0.0.0',port='5001')
# ========================================================
 