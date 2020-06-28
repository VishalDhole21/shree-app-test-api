const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const mysql      = require('mysql');
const otpGenerator = require('otp-generator');
/*
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'mySql@2019',
  database : 'ShreeApp'
});
*/

const connection = mysql.createConnection({
  host     : 'us-cdbr-east-02.cleardb.com',
  user     : 'b9b92dc2330558',
  password : 'dd0434bc',
  database : 'heroku_dea73d9734a85f3'
});

connection.connect((err) =>{
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  //console.log('connected as id ' + connection.threadId);
});

var BillId= "";
const apikey="2VD3KBRAG0ENR1O0LIIZU4J0CGE9HIWD";
const secret="IWCMZ1J0W0X5ZJQZ"
const usetype="stage";
const senderid="7718889812";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const storage = multer.diskStorage({
	destination:"./public/uploads/",
	filename:function(req,file,cb){
		cb(null,file.originalname);
	}
});

const upload = multer({
	storage:storage,
	limits:{fileSize:1000000}
}).single("myImage");

app.post("/uploadImg",(req,res)=>{
	upload(req,res,(err)=>{
		if(!err)
		{
			res.send({success:"success"})
		}
		else
		{
			console.log(err)
		}
	});
});

app.post("/updateImgPath",(req,res)=>{
	const {billid,company, filename, storeId,seasonId}=req.body;
	const filepath = `./public/uploads/${filename}`
	connection.query(`UPDATE BILLTABLE SET ImgPath='${filename}' WHERE Company='${company}' AND BillId='${billid}' and StoreId='${storeId}' AND SeasonId='${seasonId}';`
	,(err,result)=>{
		if(err){
			console.log(err);
			res.send(err);
		}
		else{
			res.send({success:"success"});
		}
	})
})

app.post("/downloadImg",(req,res)=>{
	const fileOnDisk = './public/uploads/'+req.body.filename;
	fs.readFile(fileOnDisk, 'base64', function(err, imgData){
		//imgData = '\\x'+imgData;
		res.send({imgData:imgData});
	})
});

app.post('/Stores',(req,res)=>{
	const {company}=req.body;
	connection.query(`select * from StoreTable where Company='${company}' Order By StoreId Desc`,(err, results)=>{
		if(err){
			res.send(err);
		}
		else{
			res.json(results);
		}
	})
})

app.post('/Bills',(req,res)=>{
	const {company, StoreId, SeasonId} = req.body;
	connection.query(`select * from BillTable where Company='${company}'and StoreId='${StoreId}' and SeasonId='${SeasonId}' Order By BillId Desc`
	,(err,result)=>{
		if(err)
			res.send(err);
		else
			res.json(result);
	})
})

app.post('/Seasons',(req,res)=>{
	const {company, StoreId}=req.body;
	connection.query(`select * from SeasonTable where company='${company}' and StoreId='${StoreId}' Order By SeasonId Desc`,
	(err,result)=>{
		if(err)
			res.send(err);
		else
			res.json(result)
	})
})

app.post('/CreateStore',(req,res)=>{
	const {storeName,company, storeAddress} = req.body;
	connection.query(`call CreateStore ('${storeName}','${company}','${storeAddress}',@flag,@msg);`,
	(err,result)=>{
		if(err)
			res.send(err);
		else
			res.json({store:result[0][0].store});
	})
})

app.post('/CreateSeason',(req,res)=>{
	const {storeId,company,seasonName,seasonDesc} = req.body;
	connection.query(`call CreateSeason ('${storeId}','${company}','${seasonName}','${seasonDesc}',@flag,@msg)`
	,(err,result)=>{
		if(err)
			res.send(err);
		else
			res.json({msg:result[0][0].msg, flag:result[0][0].flag});
	})
	
})

app.post('/CreateBill',(req,res)=>{
	const {company,seasonId,custName,custContact,billAmount,advanceAmount,mukut,dhotar,
		bajuBandh,kaan,bangdya,sond,remarks,storeId} = req.body;
	connection.query(`call CreateBill ('${company}','${seasonId}','${custName}','${custContact}','${billAmount}','${advanceAmount}',${mukut},${dhotar},${bajuBandh},${kaan},${bangdya},${sond},'${remarks}','','${storeId}',@flag,@msg);`,
	(err,result)=>{
		if(err)
		{
			console.log(err);
			res.send(err);
		}
		else
			res.json({billid:result[0][0].msg});
	})
	
})

app.post('/ChangePassword',(req,res)=>{
	const saltRounds = 10;
	var salt = bcrypt.genSaltSync(saltRounds);
	const {company, oldPass, newPass} = req.body;
	const encrOldPass = bcrypt.hashSync(oldPass, salt);
	const encrNewPass = bcrypt.hashSync(newPass, salt);
	connection.query(`select * from user_registration where CompanyId='${company}'`,(err, result)=>{
		if(err)
			res.send({msg:err});
		else
		if(result.length > 0)
		{
			const hash = result[0].Password;
			const match = bcrypt.compareSync(oldPass, hash);
			if(match	===	true){
				const qry = `UPDATE USER_REGISTRATION SET PASSWORD = '${encrNewPass}' WHERE COMPANYID = '${company}';`;
					connection.query(qry, 
						(err, result)=>{
				    	if(err)
				    		res.send({msg:err, success:"failed"});
				    	else
							res.send({msg:"Password changed successfully.",success:"success"});
					})
			}
			else
				res.send({msg:"Old password is incorrect.",success:"failed"});	
		}
		else
			res.send({msg:"Operation failed.",success:"failed"})
	})
	
})

app.post('/UserRegistration',(req,res)=>{
	const saltRounds = 10;
	var salt = bcrypt.genSaltSync(saltRounds);
	const {usermobilenumber,company, companyName,ownerName,address,email,password,storeAmt,maintainenceAmt} = req.body;
	
	const encrPass = bcrypt.hashSync(password, salt);
	connection.query(`CALL UserRegistration ('${usermobilenumber}','${companyName}','${company}','${ownerName}','${address}','${email}','${encrPass}','${storeAmt}','${maintainenceAmt}',@flag,@msg);`, 
		(err, result)=>{
			console.log(result[0][0]);
    	if(err)
    		res.send({msg:err.sqlMessage});
    	else
				res.json({success:"failed", msg:result[0][0].msg, flag:result[0][0].flag});
	})
})

app.post('/sendway', (req, res)=>{
        const {phone, message, company} = req.body;
        connection.query(`select count(*) as seasons from seasontable where Company='${company}' and Status='Open'`,(err, result)=>{
        	///console.log(result.length);
		if(result[0].seasons > 0)
		{
			fetch('https://www.way2sms.com/api/v1/sendCampaign',{
                        method:'post',
                        headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({apikey:apikey,
                                secret:secret,
                                usetype:usetype,
                                senderid:senderid,
                                phone:phone,
                                message:message
                        })
                })
                .then(resp=>resp.json())
                .then(data=>{
                	if(data.status == "error")
                		res.send({success:'failed', msg:data.message}); 	
                	else
                		res.send({success:'success', data:data});
                })
                .catch(err=>res.send({success:'failed',msg:err}))	
		}
		else
			res.send({success:"failed",msg:"Active season does not exist. Please create season to send message."});
	})
		
})

app.post('/sendwayall', (req, res)=>{
        const {message, company, isSendToAll, phone} = req.body;
	        	isSendToAll === true ?
	        	connection.query(`select count(*) as seasons from seasontable where Company='${company}' and Status='Open'`,(err, result)=>{
				if(result[0].seasons > 0)
				{
			     connection.query(`select distinct CustContact from BILLTABLE where company='${company}'`,
				(err, result)=>{
					const contactArr = result;
					contactArr.map((user, index)=>{
						fetch('https://www.way2sms.com/api/v1/sendCampaign',{
			                        method:'post',
			                        headers:{'Content-Type':'application/json'},
			                        body:JSON.stringify({apikey:apikey,
			                                secret:secret,
			                                usetype:usetype,
			                                senderid:senderid,
			                                phone:contactArr[index].CustContact,
			                                message:message
			                        })
			                })
							.then(resp=>resp.json())
			                .then(data=>{
			                	
			                	
			                	if(data.status == "error")
			                	{
			                		res.send({success:'failed', msg:data.message});
			                		//throw error(data.msg); 	
			                	}
			                	else
			                		res.send({success:'success', data:data});
			                })
			                .catch(err=>res.send({success:'failed',msg:err}))
				            })
					//res.send({success:'success'});
				})
			 }
			 else
				res.send({success:"failed",msg:"Active season does not exist. Please create season to send message."});
			})
	       :
	       connection.query(`select count(*) as seasons from seasontable where Company='${company}' and Status='Open'`,(err, result)=>{
			if(result[0].seasons > 0)
			{
		       fetch('https://www.way2sms.com/api/v1/sendCampaign',{
				                        method:'post',
				                        headers:{'Content-Type':'application/json'},
				                        body:JSON.stringify({apikey:apikey,
				                                secret:secret,
				                                usetype:usetype,
				                                senderid:senderid,
				                                phone:phone,
				                                message:message
				                        })
				                })
	       					.then(resp=>resp.json())
			                .then(data=>{
			                	if(data.status == "error")
			                		res.send({success:'failed', msg:data.message}); 	
			                	else
			                		res.send({success:'success', data:data});
			                })
			                .catch(err=>res.send({success:'failed',msg:err}))
	            }
	            else
				res.send({success:"failed",msg:"Active season does not exist. Please create season to send message."});
			})
	})

app.post('/UserLogin',(req,res)=>{
	const {company,password} = req.body;
	connection.query(`select * from user_registration where CompanyId='${company}'`,(err, result)=>{
		if(result.length > 0)
		{
			const hash = result[0].Password;
			const match = bcrypt.compareSync(password, hash);
			match	===	true? res.send(result[0]): res.send({success:"Failed."});	
		}
		else
			res.send({success:"Failed."});
	})
})

app.post('/SalesReport',(req,res)=>{
	const {company, storeId, seasonId, fromdate, todate}=req.body;

	const qry = `SELECT Company,StoreId,SeasonId,count(*) as soldCount, sum(BillAmount) BillAmount, sum(AdvanceAmount) AdvanceAmount,
sum(BalanceAmount) BalanceAmount
FROM ShreeApp.BillTable
where Company='${company}' 
and  case when ${storeId==="''"} then true else StoreId in(${storeId}) end 
and case when ${seasonId==="''"} then true else SeasonId in(${seasonId}) end 
and BookingDate >= '${fromdate}'
and BookingDate <= '${todate}'
group by Company,StoreId,SeasonId
order by SeasonId desc,StoreId desc;`
	connection.query(qry,
	(err,result)=>{
		if(err)
			res.send(err);
		else
			res.json(result)
	})
})

app.post('/BillView',(req,res)=>{
	const {company, storeId, seasonId, billid}=req.body;

	const qry = `SELECT *
FROM ShreeApp.BillTable
where Company='${company}' 
and  BillId='${billid}'
and  SeasonId='${seasonId}'
and StoreId='${storeId}';`

	connection.query(qry,
	(err,result)=>{
		if(err)
			res.send(err);
		else
			res.json(result)
	})
})

app.post('/SendOtp',(req,res)=>{
	const {custName, mobNo} = req.body;
	const otp=otpGenerator.generate(4, {alphabets:false, upperCase: false, specialChars: false });
	const msg=`Dear ${custName}, Your OTP to reset the password is ${otp}.--ShreeApp`;
	fetch('https://www.way2sms.com/api/v1/sendCampaign',{
	        method:'post',
	        headers:{'Content-Type':'application/json'},
	        body:JSON.stringify({apikey:apikey,
	                secret:secret,
	                usetype:usetype,
	                senderid:senderid,
	                phone:mobNo,
	                message:msg
	        })
	}).then(sent=>res.send({success:"success"}))
	.catch(err=>{alert(err)})
})

app.get('/ResetPassword',(req,res)=>{
	const{otp, newPass, company} = req.body;
	const saltRounds = 10;
	var salt = bcrypt.genSaltSync(saltRounds);
	const encrNewPass = bcrypt.hashSync(newPass, salt);

	if(otp !== '')
		res.send({msg:"Incorrect OTP"});
	else
		connection.query(`select * from user_registration where CompanyId='${company}'`,(err, result)=>{
		if(err)
			res.send({msg:err});
		else
		if(result.length > 0)
		{
			const qry = `UPDATE USER_REGISTRATION SET PASSWORD = '${encrNewPass}' WHERE COMPANYID = '${company}';`;
			connection.query(qry, 
				(err, result)=>{
		    	if(err)
		    		res.send({msg:err});
		    	else
					res.send({msg:"Password changed successfully."});
				})
		}
		else
			res.send({msg:"Operation failed."})
	})
	res.send(otp);
})

app.post('/DecorationReport',(req,res)=>{
	const {company, storeId, seasonId}=req.body;

	const qry = `SELECT *
FROM ShreeApp.BillTable
where Company='${company}' 
and  case when ${storeId==="''"} then true else StoreId in(${storeId}) end 
and case when ${seasonId==="''"} then true else SeasonId in(${seasonId}) end
order by DecStatus desc,SeasonId desc,StoreId desc;`

	connection.query(qry,
	(err,result)=>{
		if(err)
			res.send({err});
		else
			res.json(result)
	})
})

app.post('/UpdateDecStatus',(req,res)=>{
	const {company, storeId, seasonId,billid}=req.body;
	console.log(req.body)
	const qry = `UPDATE ShreeApp.BillTable set DecStatus = 'Completed' where 
	BillId = '${billid}' and SeasonId = '${seasonId}' and StoreId = '${storeId}'
	and Company = '${company}';`

	connection.query(qry,
	(err,result)=>{
		if(err)
			res.send({msg:err});
		else
			res.send({msg:`${billid} bill status updated.`})
	})
})


app.post('/UpdateStatus',(req,res)=>{
	const {company, storeId, seasonId,billid}=req.body;
	console.log(req.body)
	const qry = `UPDATE ShreeApp.BillTable set Status = 'Completed' where 
	BillId = '${billid}' and SeasonId = '${seasonId}' and StoreId = '${storeId}'
	and Company = '${company}';`

	connection.query(qry,
	(err,result)=>{
		if(err)
			res.send({msg:err});
		else
			res.send({msg:`${billid} bill status updated.`})
	})
})

app.post('/Expenses',(req,res)=>{
	const {company}=req.body;

	const qry = `SELECT *
FROM ShreeApp.ExpenseTable
where Company='${company}' order by ExpDate desc;`

	connection.query(qry,
	(err,result)=>{
		if(err)
			res.send({err});
		else
			res.json(result)
	})
})

app.post('/Payments',(req,res)=>{
	const {company}=req.body;

	const qry = `SELECT * FROM ShreeApp.PaymentTransactions
where CompanyId='${company}' Order By PaymentDate desc;`

	connection.query(qry,
	(err,result)=>{
		if(err)
			res.send({err});
		else
			res.json(result)
	})
})


app.post('/CreateExpense',(req,res)=>{
	const {company,expType,expAmount,expDesc} = req.body;
	connection.query(`Insert into ExpenseTable (ExpType,ExpDesc,Amount,Company) values
		('${expType}','${expDesc}','${expAmount}','${company}');`,
	(err,result)=>{
		if(err)
		{
			console.log(err);
			res.send(err);
		}
		else
			res.json({msg:'Expense created.'});
	})
	
})

app.post('/CreatePayment',(req,res)=>{
	const {company,amount,refno} = req.body;
	connection.query(`CALL CreatePayment ('${company}','${amount}','${refno}');`,
	(err,result)=>{
		if(err)
		{
			console.log(err);
			res.send(err);
		}
		else
			res.json({msg:result[0][0].msg});
	})
	
})

app.post('/ProfitReport',(req,res)=>{
	const {company, fromdate, todate}=req.body;
	const qry = `CALL ProfitReport('${company}','${fromdate}','${todate}');`

	connection.query(qry,
	(err,result)=>{
		if(err)
			res.send(err);
		else
			res.json(result[0][0])
	})
})

app.listen(3000,()=>{console.log('server is listening on  port 3000')});