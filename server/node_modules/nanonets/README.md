<div align="center">
  <a href="https://nanonets.com/">
    <img src="https://nanonets.com/logo.png" alt="Nanonets nodejs client" width="100"/>
    </a>
</div>

<h1 align="center">Nanonets nodejs client</h1>

** **

Nanonets provides an easy to use API to communicate with it's servers and build machine learning models and make predictions on image data. 
The models that can be built are - 
1. Image Classification
2. Multi-label Classification
3. Object Detection
4. OCR 

Check us out at https://nanonets.com. <br>
To find out about our GUI solution or to get your API key, check out https://app.nanonets.com

** **

## Installation

### npm install - 
Run the following command from your terminal - 
```bash
npm install nanonets
```
** **

## Get API Key
http://app.nanonets.com/#/keys

** **

## Inference
You can run inference on a single image or multiple images. You can use urls as well as local files. 

```
const nanonets = require('nanonets')('API Key')

let resp  = nanonets.predict({modelType : 'OCR', filePath : 'IMAGE_PATH', modelId : 'MODE_ID'})

resp.json().then(x => console.log(x))
```

** **
