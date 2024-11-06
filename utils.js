const crypto = require("crypto");
const jwt = require("jsonwebtoken");

class Tools {
    constructor () {
        this.to = "sha256"
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
            decoded = jwt.verify(token, this.secret);
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
        payload.set('online',true);
        this.data.set(userid, payload);
    }
    getuser(id) {
        if (typeof id === 'string' && this.regex.test(id)) {
            return this.data.get(id) != undefined ? this.data.get(id).get('username') : 'Player';
        } else {
            for (const entry of this.data.values()) {
                if (entry.get('ws') == id) {
                    return entry.get('username');
                }
            }
            return 'Player';
        }
    }
    remove(id) {
        if (typeof id === 'string' && this.regex.test(id)) {
            this.data.delete(id);
        } else {
            for (const [k,v] of this.data.entries()) {
                if (v.get('ws') == id) {
                    this.data.delete(v);
                    this.data.delete(k);
                    
                }
            }
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
    setws(uid,ws) {
        this.data.get(uid).set('ws',ws);
    }

    isonline(id) {
        if (typeof id === 'string' && this.regex.test(id)) {

            // Please Note, this.data.has(id) will work only in if else or ternary operator
            return this.data.has(id) ? this.data.get(id).get('online') : undefined;
        } else {
            let found = false;
                for (const v of this.data.values()) {
                    if (v.get('ws') == id) {
                        found = v.get('online');
                    }
                }
            return found;
        }
    }

    setstatus(id, flag) {
        if (typeof id === 'string' && this.regex.test(id)) {
            this.data.get(id).set('online',flag);
        } else {
            for (const v of this.data.values()) {
                if (v.get('ws') == id) {
                    v.set('online', flag);
                }
            }
        }
    }

    exists(id) {
        if (typeof id === 'string' && this.regex.test(id)) {

            // Please Note, this.data.has(id) will work only in if else or ternary operator
            return this.data.has(id) ? true : false ;
        } else {
            let found = false;
                for (const v of this.data.values()) {
                    if (v.get('ws') == id) {
                        found = true;
                    }
                }
            return found;
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