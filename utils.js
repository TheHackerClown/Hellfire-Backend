const crypto = require("crypto");
const jwt = require("jsonwebtoken");

class Tools {
    constructor () {
        this.to = "sha256"
        this.tokenexpire = 4
        this.secret = process.env.DBCROPSUBTLE
    }
    
    encode(data) {
        return crypto.createHash(this.to).update(data).digest('hex');

    }
    createtoken(username) {
        const payload = {
            username:username
        }
        return jwt.sign(payload, this.secret);
    }
    verify(token) {
        let decoded = 'Error';
        try {
            decoded = jwt.verify(token, this.secret,{ expiresIn: `${this.tokenexpire}h` });
        } catch (error) {
            decoded = "Error"
        } finally {
            return decoded;
        }
    }
        // buffertotext(data) {
        //     let newdata = new Array();
        //     data.forEach(element => {
        //         newdata.push(String.fromCharCode(element))
        //     });
        //     return newdata.join("")
        // }
}

class ActivePlayers {
    constructor(){
        this.data = {}
    }
    add(websocket, userid, username) {
        const payload = {username:username,ws:websocket};
        this.data[userid] = payload;
    }
    getuser(uid) {
        try {
            return this.data[uid].username;   
        } catch (error) {
            return undefined;
        }
    }
    remove(ws) {
        for (let [key, value] of Object.entries(this.data)) {
            if (value.ws == ws) {
                delete this.data[key];
                break;
            }
        }
    }

    getwsuser(ws) {
        let found = '';
        for (let [key, value] of Object.entries(this.data)) {
            if (value.ws == ws) {
                found = value.username;
                break;
            }
        }
        if (found!= '') {
            return found;
        } else {
            return undefined;
        }
    }
    
    getuid(ws) {
        let found = '';
        for (let [key, value] of Object.entries(this.data)) {
            if (value.ws == ws) {
                found = key;
                break;
            }
        }
        if (found!= '') {
            return found;
        } else {
            return undefined;
        }
    }
    existsuid(uid) {
        let found = 0;
        for (let [key, value] of Object.entries(this.data)) {
            if (key == uid) {
                found++;
                break;
            }
        }
        if (found==1) {
            return true;
        } else {
            return false;
        }
    }

    existsws(ws) {
        let found = 0;
        for (let [key, value] of Object.entries(this.data)) {
            if (value.ws == ws) {
                found++;
                break;
            }
        }
        if (found==1) {
            return true;
        } else {
            return false;
        }
    }
    getws(uid) {
        try {
            return this.data[uid].ws;   
        } catch (error) {
            return undefined;
        }
    }
}


module.exports ={Tools,ActivePlayers};

//const cl = new Tools();
//console.log(cl.buffertotext([ 100, 97, 100, 97 ]))

//console.log(cl.encode('creepysmichybigboifat32'))