/* Akun lokal Arena 27 Net: login, simpan kredensial ter-hash, dan sesi antar halaman. */
(function () {
    var AUTH_KEY = "arena27_local_auth";
    var SESSION_KEY = "arena27_local_session";
    var LABELS = { SIANG: "Shift Siang", MALAM: "Shift Malam", OWNER: "Owner" };
    var SHIFTS = ["SIANG", "MALAM", "OWNER"];

    function hex(bytes) {
        return Array.from(new Uint8Array(bytes), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    }

    function randomSalt() {
        var arr = new Uint8Array(16);
        if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
        else for (var i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
        return hex(arr);
    }

    function strongCrypto() {
        return !!(window.crypto && crypto.subtle && crypto.subtle.importKey);
    }

    /* Untuk file:// atau http LAN, Web Crypto tidak tersedia. Hash ringan dipakai supaya
       aplikasi tetap bisa dipakai; di GitHub Pages (https) selalu pakai PBKDF2. */
    function liteHash(secret, salt) {
        var h = 2166136261 >>> 0;
        var input = salt + "\u2063" + secret;
        for (var round = 0; round < 20000; round++) {
            for (var i = 0; i < input.length; i++) {
                h ^= input.charCodeAt(i) + round;
                h = Math.imul(h, 16777619) >>> 0;
            }
        }
        return ("00000000" + h.toString(16)).slice(-8).repeat(8).slice(0, 64);
    }

    function hash(secret, salt, algo) {
        if (algo === "lite") return Promise.resolve(liteHash(secret, salt));
        var enc = new TextEncoder();
        var saltBytes = new Uint8Array(salt.match(/../g).map(function (p) { return parseInt(p, 16); }));
        return crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"])
            .then(function (key) {
                return crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: 150000, hash: "SHA-256" }, key, 256);
            })
            .then(hex);
    }

    function accounts() {
        var raw;
        try { raw = JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { raw = null; }
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) raw = {};
        SHIFTS.forEach(function (k) {
            var a = raw[k];
            if (!a || typeof a !== "object" || typeof a.salt !== "string" || typeof a.hash !== "string") delete raw[k];
        });
        return raw;
    }

    function saveAccounts(list) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(list));
    }

    function validInput(account, username, secret) {
        if (account === "OWNER") return /^\d{4,8}$/.test(secret) ? "" : "PIN Owner harus 4 sampai 8 angka.";
        if (username.length < 3) return "Username minimal 3 karakter.";
        if (secret.length < 6) return "Password minimal 6 karakter.";
        var taken = SHIFTS.filter(function (s) { return s !== account && s !== "OWNER"; })
            .some(function (s) { var a = accounts()[s]; return a && a.username && a.username.toLowerCase() === username.toLowerCase(); });
        return taken ? "Username sudah dipakai shift lain." : "";
    }

    function register(account, username, secret) {
        var problem = validInput(account, username, secret);
        if (problem) return Promise.reject(new Error(problem));
        var algo = strongCrypto() ? "pbkdf2" : "lite";
        var salt = randomSalt();
        return hash(secret, salt, algo).then(function (digest) {
            var list = accounts();
            list[account] = { username: account === "OWNER" ? "OWNER" : username, salt: salt, hash: digest, algo: algo };
            saveAccounts(list);
            return account;
        });
    }

    function login(account, username, secret) {
        var saved = accounts()[account];
        if (!saved) return Promise.reject(new Error("Akun ini belum dibuat."));
        var nameOk = account === "OWNER" || (saved.username || "").toLowerCase() === username.trim().toLowerCase();
        return hash(secret, saved.salt, saved.algo || "pbkdf2").then(function (digest) {
            if (!nameOk || digest !== saved.hash) throw new Error(account === "OWNER" ? "PIN Owner tidak cocok." : "Username atau password tidak cocok.");
            return account;
        });
    }

    function startSession(account) {
        var saved = accounts()[account] || {};
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            account: account,
            username: saved.username || "",
            at: Date.now()
        }));
        return account;
    }

    function session() {
        var s;
        try { s = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { s = null; }
        if (!s || SHIFTS.indexOf(s.account) < 0) return null;
        return s;
    }

    function signOut() {
        localStorage.removeItem(SESSION_KEY);
    }

    window.ArenaAuth = {
        AUTH_KEY: AUTH_KEY,
        SESSION_KEY: SESSION_KEY,
        LABELS: LABELS,
        SHIFTS: SHIFTS,
        accounts: accounts,
        isOwnerPin: function (account) { return account === "OWNER"; },
        register: register,
        login: login,
        startSession: startSession,
        session: session,
        signOut: signOut,
        /* halaman kerja pakai ini: belum login = balik ke login.html */
        guard: function () {
            if (session()) return true;
            location.replace("login.html");
            return false;
        }
    };
})();
