const express = require('express');
const knex	=	require('knex');
const cors = require('cors');
var bodyParser = require('body-parser')
const Nexmo = require('nexmo');
const way2sms = require('way2sms');
const fetch = require('node-fetch')
const fs = require('fs')

const db = knex ({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : '',
    password : '',
    database : 'avcreations'
  }
});

const nexmo = new Nexmo({
  apiKey: '076543b2',
  apiSecret: 'nqdT2zl1aLc30m07'
});


const app	=	express();
app.use(cors());

//app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())


app.get('/', (req, res)=>{
	db.select('*').from('ss_bills')
	.orderBy('billid', 'desc')
	.then(data =>{
	res.send(data);
});
})

app.post('/createbill', (req, res)=>{
	const {custcontact,custname,billamount,advanceamount,balanceamount,status,mukut,dhotar,bajubandh,bangadya,
		kaan,sond,remarks} = req.body;
	//var balanceamount = parseReal(billamount)-parseReal(advanceamount);
	db('ss_bills')
	.returning('*')
	.insert({custcontact:custcontact, custname:custname, billamount:billamount, advanceamount:advanceamount, 
		status:status,bookingdate:new Date(),balanceamount:balanceamount, mukut:mukut, dhotar:dhotar,
		bajubandh:bajubandh,bangadya:bangadya,kaan:kaan,sond:sond,remarks:remarks})
	.then(match=>{res.json(match[0])})
	.catch(err=>{res.json(err)});
	})

app.post('/send', (req, res) =>{
  // Send SMS
  console.log(req.body)
  const {toNumber,message}= req.body;
  nexmo.message.sendSms(
    '917718889812', toNumber, message, {type: 'unicode'},
    (err, responseData) => {if (responseData) {console.log(responseData);
    	res.send(responseData)}}
  );
})

app.post('/sendway', (req, res)=>{
	const {phone, message} = req.body;
	console.log(req.body);
fetch('https://www.way2sms.com/api/v1/sendCampaign',{
			method:'post',
			headers:{'Content-Type':'application/json'},
			body:JSON.stringify({apikey:"2VD3KBRAG0ENR1O0LIIZU4J0CGE9HIWD",
				secret:"IWCMZ1J0W0X5ZJQZ",
				usetype:"stage",
				senderid:"7718889812",
				phone:phone,
				message:message
			})
		})
		.then(sent=>{res.send('Success');
		})
	})

app.post('/uploadImg',(req,res)=>{
	console.log(req.body)
	const billid=req.body.billid
	const loc_on_disk = '/Users/vishal/Desktop/Web development/siddhikalakendra/Images/'+req.body.fileName;
	console.log(loc_on_disk);
	fs.readFile(loc_on_disk, 'hex', function(err, imgData) {
        //console.log('imgData',imgData);
        imgData = '\\x' + imgData;
        db('ss_bills')
		.where('billid','=',billid)
		.update('pic',imgData)
		.then(updRows=>{
		res.send('Success');
		})
      });
})

app.get('/downloadImg', function(req, res, next) {
  db('ss_bills')
  .where('billid','=',1)
  .select('pic')
  .then((readResult) =>{
    //console.log('pg readResult',readResult);
    fs.writeFile('/Users/vishal/Desktop/Documents/Id Docs/foo.jpg', readResult[0].pic);
    res.json(200, {success: true});
  })
});

app.post('/deliver', (req, res)=>{
	const {billid} = req.body;
	console.log(billid);
	//var balanceamount = parseReal(billamount)-parseReal(advanceamount);
	db('ss_bills')
	.where('billid','=',billid)
	.update('status','Delivered')
	.then(updRows=>{
		res.send('Success');
	})
	})



app.listen(process.env.PORT || 3000);