
const jwt = require("jsonwebtoken")
const { uid } = require('./node_modules/uid/secure/index');
const { check } = require("prisma");

class Tools {
    #secret;
    constructor() {
        this.to = "sha256";
        this.#secret = process.env.DBCROPSUBTLE;
        this.queue = new Map();
    }
    createtoken(username) {
        const payload = {
            username: username
        }
        const options = { expiresIn: "4h" };
        return jwt.sign(payload, this.#secret, options);
    }
    verify(token) {
        let decoded = 'Error';
        try {
            decoded = jwt.verify(token, this.#secret);
        } catch (error) {
            decoded = "Error"
        } finally {
            return decoded;
        }
    }
    MAPGEN(blocksize, columns, rowcurr = 3, colcurr = 0) {
        let map = new Array(columns);// Map Array

        //Strict Checking for Out Of Map Coordinates
        const isdefined = (map, row, col) => { return map[row] !== undefined && map[row][col] !== undefined; }
        //Blank Space Flood Fill
        for (let i = 0; i < rows; i++) {
            map[i] = new Array(columns).fill(1);
        }
        //Starting Point
        map[rowcurr][colcurr] = 0;
        let found = 0;// Constraint for Loop till Favourable Path is Found
        const dir = [[-1, 0], [0, 1], [1, 0]]; // Direction Array

        //Looping Path Tracer until end point contains column 3
        while (1 != found) {
            for (let j = 0; j < blocksize * 2; j++) {
                let value = Math.floor(Math.random() * dir.length);//Random Index For Direction Array
                value = value == 3 ? 2 : value; // Rare Case Check
                let [dr, dc] = dir[value];//Random Direction
                if (isdefined(map, rowcurr + dr, colcurr + dc) && colcurr + dc >= 0 && colcurr + dc < columns) {
                    rowcurr += dr; colcurr += dc;//Move Pointer
                    map[rowcurr][colcurr] = 0;//Fill Path
                    if (isdefined(map, rowcurr, colcurr + dc)) {
                        map[rowcurr][colcurr + dc] = 0//Adding FLood while continuing towards the right direction
                    }
                }

            }
            if (map[3][columns - 1] == 0) {
                found++;
                break;
            }
        }

        //End Filter, to remove garbage values
        for (let j = 0; j < rows; j++) {
            while (map[j].length > columns) {
                map[j].pop()
            }
        }
        map[4][0] == 0;
        map[2][0] == 0;
        map[4][columns - 1] == 0;
        map[2][columns - 1] == 0;
        return map;
    }
}

class ActivePlayers {
    #data;
    constructor() {
        this.#data = new Map();
        this.regex = /^[\w-]+\.[\w-]+\.[\w-]+$/
    }
    add(websocket, userid, username) {
        const payload = new Map();
        payload.set('username', username);
        payload.set('ws', websocket);
        payload.set('online', true);
        this.#data.set(userid, payload);
    }
    getuser(id) {
        if (typeof id === 'string' && this.regex.test(id)) {
            return this.#data.get(id) != undefined ? this.#data.get(id).get('username') : 'Player';
        } else {
            for (const entry of this.#data.values()) {
                if (entry.get('ws') == id) {
                    return entry.get('username');
                }
            }
            return 'Player';
        }
    }
    remove(id) {
        if (typeof id === 'string' && this.regex.test(id)) {
            this.#data.delete(id);
        } else {
            for (const [k, v] of this.#data.entries()) {
                if (v.get('ws') == id) {
                    this.#data.delete(v);
                    this.#data.delete(k);

                }
            }
        }
    }


    getuid(userorws) {
        let found = '';
        if (typeof userorws === "string") {
            for (const [k, v] of this.#data.entries()) {
                if (v.get('username') == userorws) {
                    found = k;
                }
            }

        } else {

            for (const [k, v] of this.#data.entries()) {
                if (v.get('ws') == userorws) {
                    found = k;
                }
            }

        }
        return found != '' ? found : "Player";
    }
    setws(uid, ws) {
        this.#data.get(uid).set('ws', ws);
    }

    isonline(id) {
        if (typeof id === 'string' && this.regex.test(id)) {

            // Please Note, this.#data.has(id) will work only in if else or ternary operator
            return this.#data.has(id) ? this.#data.get(id).get('online') : undefined;
        } else {
            let found = false;
            for (const v of this.#data.values()) {
                if (v.get('ws') == id) {
                    found = v.get('online');
                }
            }
            return found;
        }
    }

    setstatus(id, flag) {
        if (typeof id === 'string' && this.regex.test(id)) {
            this.#data.get(id).set('online', flag);
        } else {
            for (const v of this.#data.values()) {
                if (v.get('ws') == id) {
                    v.set('online', flag);
                }
            }
        }
    }

    exists(id) {
        if (typeof id === 'string' && this.regex.test(id)) {

            // Please Note, this.#data.has(id) will work only in if else or ternary operator
            return this.#data.has(id) ? true : false;
        } else {
            let found = false;
            for (const v of this.#data.values()) {
                if (v.get('ws') == id) {
                    found = true;
                }
            }
            return found;
        }
    }
    getws(uid) {
        return this.#data.get(uid) != undefined ? this.#data.get(uid).get('ws') : undefined;
    }
}


class RoomManager {
    #queue;
    #existing;
    constructor() {
        this.#queue = [];
        this.#existing = new Map();
        this.codelen = 6;
        this.roomlen = 20;
    }
    generatecode() {
        const roomid = uid(this.codelen);
        this.#queue.push(roomid);
        return roomid;
    }
    rmcode(code) {
        this.#queue = this.#queue.filter((val, _) => val !== code);
    }
    create(uid, ws, map) {
        const room = new Map();
        room.set("roomid", this.generatecode());
        room.set("owner", new Map([["uid", uid], ["ws", ws]]));
        room.set('roomlen', this.roomlen);
        room.set('map', map);
        room.set('chats', []);
        room.set('currlen', 1);
        room.set('users', new Map([[uid, new Map([['ws', ws], ['ready', true]])]]));
        this.#existing.set(room.get('roomid'), room);
        return room.get("roomid");
    }
    add(roomid, uid, ws) {
        if (this.#checkid(roomid)) {
            let room = this.#existing.get(roomid);
            if (room.get('currlen') < this.roomlen) {
                room.get('users').set(uid, new Map([['ws', ws], ['ready', false]]));
                room.set('currlen', room.get('currlen') + 1);
                let item = [];
                room.get('users').forEach((val, key) => { if (key != uid) { item.push(val.get('ws')) } })
                return [item, roomid, room.get('map'), room.get('chats')];
            } else {
                return [false, "Room Full", false, false];
            }
        } else {
            return [false, "Room Doesn't Exists", false, false];
        }
    }

    getowner(roomid) {
        return this.#existing.has(roomid) ? this.#existing.get(roomid).get('owner') : false;
    }
    getid(uid) {
        let data = null;
        this.#existing.forEach((value, key) => { value.get('users').forEach((userval, keyuid) => { uid === keyuid ? data = keyuid : null }) })
        return data ? data : false;
    }
    kick(roomid, owner, uidtokick) {
        if (this.#checkid(roomid)) {
            if (this.#existing.get(roomid).get('owner').get('uid') === owner && this.#existing.get(roomid).get('owner').get('uid') !== uidtokick) {
                let item = ['member'];
                this.#existing.get(roomid).get('users').forEach((val, key) => { if (key != uidtokick) { item.push(val.get('ws')) } })
                this.#existing.get(roomid).get('users').delete(uidtokick);
                return item;
            } else if (this.#existing.get(roomid).get('owner').get('uid') === uidtokick && this.#existing.get(roomid).get('owner').get('uid') === owner) {
                let item = ['leader'];
                this.#existing.get(roomid).get('users').forEach((val, key) => { if (key != owner) { item.push(val.get('ws')) } })
                this.#existing.delete(roomid);
                this.rmcode(roomid);
                return item;
            }
        } else {
            return false;
        }
    }
    #checkid(roomid) {
        return this.#existing.has(roomid);
    }
    changemap(roomid, map, owner) {
        if (this.#checkid(roomid)) {
            let room = this.#existing.get(roomid);
            if (room.get('owner').get('uid') === owner) {
                room.set('map', map);
                return this.#givefullwslist();
            } else { return false; }
        } else { return false; }
    }
    ready(roomid, uid) {
        if (this.#checkid(roomid)) {
            let room = this.#existing.get(roomid);
            if (room.get('users').has(uid) && room.get('users').get(uid).get('ready') === false) {
                room.get('users').get(uid).set('ready', true);
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
    #givefullwslist(roomid) {
        let item = [];
        this.#existing.get(roomid).get('users').forEach((val, _) => { item.push(val.get('ws')) });
        return item;
    }
    addchat(roomid, username, body) {
        if (this.#checkid(roomid)) {
            let data = this.#existing.get(roomid).get("chats");
            let item =
                data.push(`${body}§${username}`);
            this.#existing.get(roomid).set("chats", data);
            return this.#givefullwslist(roomid);
        } else {
            return false;
        }
    }


}


module.exports = { Tools, ActivePlayers, RoomManager };

//const cl = new Tools();
//console.log(cl.buffertotext([ 100, 97, 100, 97 ]))

//console.log(cl.encode('creepysmichybigboifat32'))