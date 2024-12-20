const wss = require("ws");
const { Tools, ActivePlayers, RoomManager } = require("./utils");
const allowed_hosts = ['https://thehackerclown.github.io', 'http://localhost:5173']

process.loadEnvFile('.env')//Secret for JWT

const ActUser = new ActivePlayers();
const Tool = new Tools();
const RoomMan = new RoomManager();

const db = new wss.WebSocketServer({
    port: 8080,
    clientTracking: true,
    verifyClient: (info, callback) => {
        if (allowed_hosts.includes(info.origin) || info) { //remove the || info during production
            callback(true);
        } else {
            callback(false);
        }
        console.log('Player Source:', info.origin);
    },
    protocols: ['json']
});

const userdb = { "admin": "admin" }

function authenticateUser(username, password) {
    if (!username || !password) return false;
    if (userdb[username] != undefined) {
        if (userdb[username] == password) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

function fire(ws, code, data) {
    ws.send(JSON.stringify({ code: code, data: data }))
}

//Safe Entry Point for User
function login_connect(ws, msg) {
    switch (msg.code) {
        case 1:
            /*Connection Test 
            recieve format : msg : {code: number, data: "string", uid: null}
            send format: msg : {code: number, data: "string", uid: null}

            codes:
            1 : from user, to user | connection test
            */
            fire(ws, 1, "Connection Successful");
            break;
        case 100:
            /*Login Gate | Relogin Gate
            recieve format : msg : {code: 100, data: null | {token: username, tokpass: password}, uid: string.string.string | null }
            send format: msg : {code: 101 | 110, data: "string" | {uid: string.string.string, username : username}}

            codes: 
            100: from user, login | relogin
            101: to user, successful login
            110: to user, failed login
            */
            if (msg.uid && ActUser.exists(msg.uid) && !ActUser.isonline(msg.uid)) {
                ActUser.setstatus(msg.uid, true);
                ActUser.setws(msg.uid, ws);
                const decode = Tool.verify(msg.uid);
                fire(ws, 101, { uid: msg.uid, username: decode.username });
                console.log(`${ActUser.getuser(ws)} logged in`);
                return;
            } else if (msg.data && !msg.uid) {
                const auth = authenticateUser(msg.data.token, msg.data.tokpass);
                if (auth == true) {
                    const uid = Tool.createtoken(msg.data.token);
                    ActUser.add(ws, uid, msg.data.token.toString());
                    fire(ws, 101, { uid: uid, username: msg.data.token });
                    console.log(`${ActUser.getuser(ws)} logged in`);
                } else {
                    fire(ws, 110, "Username or Password is Incorrect")
                }
            }
            break;
        case 111:
            /*Log Out Gate
            recieve format : msg : {code: 111, data: null, uid: string.string.string}
            send format: msg : {code: 111, data: "string"}

            codes:
            111: from user, to user | log out
            */
            if (msg.uid && ActUser.exists(msg.uid) && ActUser.isonline(msg.uid)) {
                console.log(`${ActUser.getuser(msg.uid)} logged out`);
                ActUser.remove(msg.uid);
                fire(ws, 111, 'Logged Out');
            }
            break;
        default:
            /*Error Gate
            send format: msg : {code: 500, data: "string"}

            codes:
            500: to user | Error
            */
            fire(ws, 500, "Internal Error");
            break;
    }
}


//Logic for Match related Message
function coderun(ws, msg) {
    switch (msg.code) {
        case 120:
            /*Match Gate
            coming soon
            */
            console.log("data interchange during match");
            break;
        case 190:
            /*Chat Gate
            recieve format : msg : {code: 190, data: {roomid: 'string',message: "string" }, uid: string.string.string }
            send format: msg : {code: 190 | 500 , data: "loremipsumdash§username" | "Message not Added"}

            codes:
            190: from user, to user | chat addition
            500: to user | Error
            */
            if (msg.data.roomid) {
                let username = ActUser.getuser(msg.uid);
                let message = msg.data.message;
                let result = RoomMan.addchat(msg.data.roomid, username, message);
                if (result) {
                    result.forEach((val) => { fire(val, 190, `${message}§${username}`) })
                } else {
                    fire(ws, 500, "Message not Added");
                }
            }
            break;
        case 200:
            /*Leaderboard Gate
            coming soon
            */
            console.log("leaderboard asked");
            break;
        case 210:
            /*Create Room Gate
            recieve format : msg : {code: 210, data: null, uid: string.string.string }
            send format: msg : {code: 210, data: {map: maparray, roomid: "string"}}

            codes:
            210: from user, to user | room creation
            */
            let newmap = Tool.MAPGEN(50, 25, 3, 0);
            let roomid = RoomMan.create(msg.uid, ws, newmap);
            fire(ws, 210, { map: newmap, roomid: roomid });
            break;
        case 211:
            /*Map Change Gate 
            recieve format : msg : {code: 211, data: {roomid: "string"},uid: string.string.string}
            send format: msg : {code: 211 | 500, data: {map: maparray } | "Map Can't Change"}

            codes:
            211: from user, to user | map change
            500: to user | Error
            */
            let remap = Tool.MAPGEN(50, 25, 3, 0);
            let resultmap = RoomMan.changemap(msg.data.roomid, remap, msg.uid);
            if (resultmap) {
                resultmap.forEach((val, _) => { fire(val, 211, { map: remap }); })

            } else {
                fire(ws, 500, "Map Can't Change");
            }
            break;
        case 220:
            /*Join Room Gate
            recieve format : msg : {code: 220, data: {roomid: "string"}, uid : string.string.string}
            send format to new user : msg : {code: 220 | 500, data: {roomid: "string", map: maparray, chats: chatsarray} | CustomErrorMessage}
            send format to old user : msg : {code: 220 | 500, data: {username: "string"} | CustomErrorMessage}

            codes:
            220: from user, to user | Join room, inform old users
            500: to user | Error
            */
            let [wslistadd, roomidverifiedorerror, prevmap, prevchats] = RoomMan.add(msg.data.roomid, msg.uid, ws);
            if (wslistadd) {

                fire(ws, 220, { roomid: roomidverifiedorerror, map: prevmap, chats: prevchats });
                wslistadd.forEach((val) => {
                    fire(val, 220, { username: ActUser.getuser(msg.uid) })
                })
            } else {
                fire(ws, 500, roomidverifiedorerror)
            }
            break;
        case 221:
            /*Exit Room Gate
            recieve format : msg : {code: 221, data: {roomid: "string", kickuser: "usernamestring"}, uid: string.string.string}
            send format to exiting user: msg : {code: 221, data: "Removed from Room"}
            send format to connected user: msg : {code: 221, data: {username : "usernamestring"}}

            codes:
            221: from user, to user | exit room, inform connected players
            */
            let wslist = RoomMan.kick(msg.data.roomid, msg.uid, ActUser.getuid(msg.data.kickuser));
            if (wslist) {
                wslist.shift();
                fire(ws, 221, "Removed from Room");
                wslist.forEach((val) => { fire(val, 221, { username: ActUser.getuser(ws) }) });
            }
            break;
        default:
            /*Error Gate
            send format: msg : {code: 500, data: "string"}

            codes:
            500: to user | Error
            */
            fire(ws, 500, "Supply Code Not Found");
            break;
    }

}


// Main Server Logic
db.on("connection", (ws) => {
    console.log('Player Connected');
    ws.on('message', (data) => {
        const msg = JSON.parse(data);

        //Check for Bots or uid theives
        if (msg.code > 111) {
            if (msg.uid != null) {
                const decoded = Tool.verify(msg.uid);
                if (decoded != "Error") {
                    coderun(ws, msg);
                } else {
                    fire(ws, 110, "Error with Login")
                }

            } else {

                fire(ws, 500, "Who Are You?");

            }

        } else {

            login_connect(ws, msg);

        }
    });

    ws.on("close", () => {
        ActUser.setstatus(ws, false);
        let wslist = RoomMan.kick(RoomMan.getid(ActUser.getuid(ws)), ActUser.getowner(RoomMan.getid(ActUser.getuid(ws))), ActUser.getuid(ws));
        if (wslist) {
            if (wslist[0] == 'leader') {
                wslist.shift();
                wslist.forEach((val) => { fire(val, 222, "Leader Left") });
            } else {
                wslist.shift();
                wslist.forEach((val) => { fire(val, 221, { username: ActUser.getuser(ws) }) });
            }
        }
        console.log(`${ActUser.getuser(ws)} disconnected`);
    });
});