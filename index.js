var qs = require('qs');
var events = require('events');
var request = require('request');
var AWS = require('aws-sdk');  
var jsonData = require('./data');

AWS.config.region = 'ap-southeast-1';  

exports.handler = function(event, context) {  
var instances = [];
var encodedString = "";
var payload = "";
var jsonobj = "";
var actions = "";
var instanceid = "";
var status = "";
var message = "";
var name="";
var payloadopt=[];
var ownerTag='';
var nameTag='';
var promise={};
var instances = [];
   
    
    console.log("\n\nLoading handler\n\n");
    console.log(event);

    var ec2 = new AWS.EC2();
    if(event.postBody != null){
  var encodedString = event.postBody;
    payload = qs.parse(encodedString).payload;
    jsonobj = JSON.parse(payload);
    actions = jsonobj.actions;
    
    var instanceobj = JSON.parse(jsonobj.actions[0].value);
    instanceid = instanceobj.instanceid;
    var availability = instanceobj.region;
    var region = availability.slice(0, availability.length-1);
    console.log(region);
    AWS.config.region = region;  
    var ec2 = new AWS.EC2()
    name = jsonobj.user.name;
    console.log(actions[0].name)
    if(actions[0].name === "Stop"){ 
var params = {InstanceIds: [instanceid]};
  ec2.stopInstances(params,function(err,data){
      if(err){
          console.log(err);
          context.done(null, "Some error from our side.Please try after sometime.");
      }else if(data){
          console.log(data);
         var  message = {
        "text": name+" has requested to stop the instance "+instanceid+" and the current status is stopping",
        "replace_original": false
    };
    context.done(null, message);
      }
  });

    }

}else if(event.Records != null){
console.log(JSON.parse(event.Records[0].Sns.Message).AlarmDescription);
var alarmDesc = JSON.parse(event.Records[0].Sns.Message).AlarmDescription;
    request({
            uri : jsonData.slackUrl,
            method:'POST',
            headers: {
        "content-type": "application/json",
        },
            json:{"text": alarmDesc}

        },function(error,response,body){
            console.log("output"+body);
        });

}else{
console.log("No PostBody");

       
var getInstancesByregion = function(regionname,count){
     
    console.log("region"+regionname);
    AWS.config.region = regionname ;
    console.log(AWS.config.region);
        var ec2 = new AWS.EC2().describeInstances();
         global["prom"+count]  = ec2.promise();
    
}

 ec2.describeRegions(function(err,data){
     console.log(data);
            var regions = data.Regions;
            var promarray =[];
            sendRegion(0);
            function sendRegion(x){

                if(x<regions.length){
                    getInstancesByregion(regions[x].RegionName,x);
                    console.log(x);
                    promarray.push(global["prom"+x]);
                    x++;
                    sendRegion(x);
                }

            }
            console.log(promarray);
            Promise.all(promarray).then(function(values){
                values.forEach(function(data){
                 if (err) console.log(err, err.stack); // an error occurred
        else{
            var reservations = data.Reservations;
            instances = [];
            reservations.forEach(function(reservation){
                 instances.push(reservation.Instances);
                 
            });
           console.log(instances.length);
            instances.forEach(function(instance){
                 instance.forEach(function(instan){
                console.log(instan)
                console.log(instan.Tags);
                instan.Tags.forEach(function(tag){
                    console.log(tag.Key+" "+tag.Value);
                 ownerTag = tag.Key === "Owner" ? tag.Value : '--';
                 nameTag = tag.Key === "Name" ? tag.Value : '--';
                })
              
                var availability = instan.Placement.AvailabilityZone;
                  var valuenew = {"instanceid" : instan.InstanceId,"region" :availability };
                if(instan.State.Name === "running"){

                payloadopt.push( {
                "text": " Instance ID : "+instan.InstanceId+" Instance Type "+instan.InstanceType+"\n Owner: "+ownerTag+"   Name : "+nameTag+"\n AvailabilityZone : "+availability,
                "fallback": "You are unable to stop an instance",
                "callback_id": "wopr_game",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions":  [{
            "name": "Stop",
            "text": "Stop",
            "type": "button",
            "style": "primary",
            "value": JSON.stringify(valuenew), 
            
            }]
        });
        }	
           console.log(instan.State.Name);
           });
            });
           
          console.log(instances);
           
                }
  
      
                });

              console.log("payload"+payloadopt[0].actions[0].value.region);
      request({
            uri : jsonData.slackUrl,
            method:'POST',
            headers: {
        "content-type": "application/json",
        },
            json:{"text":"There are total "+payloadopt.length+" running instancecs.\n Please stop them if not in use","attachments":payloadopt}

        },function(error,response,body){
            console.log("output"+body);
        });
            });


          
        });
     
   
}
};  