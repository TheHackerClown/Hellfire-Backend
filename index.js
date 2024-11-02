const wss = require("ws");
const {Tools, ActivePlayers} = require("./utils");
const jwt = require("jsonwebtoken");

process.loadEnvFile('.env')

const ActUser = new ActivePlayers();
const Tool = new Tools();

const db = new wss.WebSocketServer({
    port:8080, 
    clientTracking:true, 
    verifyClient: (info, callback) => {
    console.log('Player Source:', info.origin);
    callback(true)
    },
    protocols: ['json']
});

const userdb = {"dhruv":"dhruv"}

function authenticateUser(username, password) {
    if (userdb[username] != undefined) {
        if (userdb[username]== password) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function fire(ws,code,data) {
    ws.send(JSON.stringify({code:code,data:data}))
}

//Safe Entry Point for User
function login_connect(ws,msg) {
    switch (msg.code) {
        case 1:
            fire(ws, 1, "Connection Successful");
            break;
        case 100:
            const auth = authenticateUser(msg.data.token, msg.data.tokpass);
            if (auth == true) {
                const uid = Tool.createtoken(msg.data.token);
                console.log(uid);
                ActUser.add(ws,uid,msg.data.token);
                fire(ws, 101, uid);
            } else {
                fire(ws, 110, "Username or Password is Incorrect")
            }
            break;
        default:
            fire(ws,500,"Internal Error");
            break;
    }
}

//Logic for incoming messages
function coderun(ws, msg) {
    switch (msg.code) {
        case 120:
            console.log("data interchange during match");
            break;
        case 190:
            console.log("chats recieved");
            break;
        case 200:
            console.log("leaderboard asked");
            break;
        case 220:
            console.log("attach user to queue");
            break;
        default:
            fire(ws, 500, "Supply Code Not Found");
            break;
        }

}


// Main Server Logic
db.on("connection", (ws) => {
    console.log('Player Connected');
    ws.on('message', (data) => {

        const msg = JSON.parse(data);

        if (msg.code != 1 && msg.code != 100) {
            if (msg.uid != null) {
                    const decoded = Tool.verify(msg.uid);
                    console.log(decoded);
                    if (decoded!="Error") {

                        coderun(ws, msg);

                    } else {

                        fire(ws,110,"Error with Login")    
                    
                    }

            } else {

                fire(ws,500, "Who Are You?");
            
            }

        } else {

            login_connect(ws,msg);
        
        }
    
    });


    ws.on("close",(ws)=>{
        console.log(ActUser.existsws(ws))
        console.log(ActUser.getwsuser(ws))
        if (ActUser.existsws(ws)) {
            console.log(`${ActUser.getwsuser(ws)} disconnected`)
        } else {
            console.log("Player Disconnected")
        }
        ActUser.remove(ws)
    });
});