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
        this.data = new Map();
        this.regex = /^[\w-]+\.[\w-]+\.[\w-]+$/
    }
    add(websocket, userid, username) {
        const payload = new Map();
        payload.set('username', username);
        payload.set('ws',websocket);
        this.data.set(userid, payload);
    }
    getuser(id) {
        switch (this.regex.test(id)) {
            case true:
                return this.data.get(id) != undefined ? this.data.get(id).get('username') : 'Player';
                break;
            case false:
                for (const entry of this.data.values()) {
                    if (entry.get('ws') == id) {
                        return entry.get('username');
                    }
                }
                return 'Player';
                break;
            default:
                break;
        }
    }
    remove(id) {
        switch (this.regex.test(id)) {
            case true:
                this.data.delete(id);
                break;
            case false:
                for (const [k,v] of this.data.entries()) {
                    if (v.get('ws') == id) {
                        this.data.delete(v);
                        this.data.delete(k);
                        
                    }
                }
                break;
            default:
                break;
        }
    }
    
    getuid(ws) {
        let found = '';
        for (const [k,v] of this.data.entries()){
            if (v.get('ws') == ws) {
                found = k;
            }
        }
        return found!='' ? found : undefined;
    }


    exists(id) {
        switch (this.regex.test(id)) {
            case true:
                return this.data.has(id);
                break;
            case false:
                let found = false;
                for (const v of this.data.values()) {
                    if (v.get('ws') == id) {
                        found = true;
                    }
                }
                return found;
                break;
            default:
                break;
        }
    }
    getws(uid) {
        return this.data.get(uid) != undefined ? this.data.get(uid).get('ws') : undefined;
    }
}


module.exports ={Tools,ActivePlayers};

//const cl = new Tools();
//console.log(cl.buffertotext([ 100, 97, 100, 97 ]))

//console.log(cl.encode('creepysmichybigboifat32'))