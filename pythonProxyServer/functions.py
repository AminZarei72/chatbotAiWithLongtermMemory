import gc
import torch
from transformers import pipeline 
# ========================================================
def predict_godel_base(conversationHistory,model,tokenizer,maxLength):
    inputs = tokenizer(conversationHistory, return_tensors="pt").input_ids
    with torch.no_grad():
        outputs = model.generate(inputs, max_length=maxLength, min_length=8, do_sample=True)
    result = tokenizer.decode(outputs[0], skip_special_tokens=True)
    del inputs
    del outputs
    del conversationHistory
    gc.collect()
    return result
# ======================================================== 
def predict_mask(tokenizer, model,sentences:list):
    pipeFunction = pipeline("fill-mask",model=model,tokenizer=tokenizer)
    res=pipeFunction(sentences[0]+pipeFunction.tokenizer.mask_token+sentences[1])
    gc.collect()
    return res
# ========================================================
def getVector(tokenizer, model,sentences:list):
    encoded_input = tokenizer(sentences, padding=True, truncation=True, return_tensors='pt')
    # Compute token embeddings
    with torch.no_grad():
        model_output = model(**encoded_input)
    sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    sentence_embeddings = torch.nn.functional.normalize(sentence_embeddings, p=2, dim=1)
    gc.collect()
    return sentence_embeddings.tolist()
# ========================================================
#Mean Pooling - Take attention mask into account for correct averaging
def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0] #First element of model_output contains all token embeddings
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
# ========================================================
