/* Latar anime hidup: video (kalau ada) + adegan canvas (malai sakura, bintang, skyline). */
(function () {
    var prefersReduced = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches;

    var stack = document.createElement("div");
    stack.className = "bg-stack";
    stack.setAttribute("aria-hidden", "true");

    var canvas = document.createElement("canvas");
    canvas.className = "bg-canvas";
    var veil = document.createElement("div");
    veil.className = "bg-veil";
    var grain = document.createElement("div");
    grain.className = "bg-grain";
    stack.appendChild(canvas);
    stack.appendChild(veil);
    stack.appendChild(grain);
    document.body.insertBefore(stack, document.body.firstChild);

    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var stars = [], petals = [], city = [], orbs = [], shooting = null, t = 0;

    function rand(a, b) { return a + Math.random() * (b - a); }

    function build() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth = window.innerWidth;
        H = canvas.clientHeight = window.innerHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        stars = [];
        var starCount = Math.round(W * H / 9000);
        for (var i = 0; i < starCount; i++) {
            stars.push({ x: rand(0, W), y: rand(0, H * .68), r: rand(.4, 1.5), p: rand(0, 6.28), s: rand(.6, 2) });
        }

        petals = [];
        var petalCount = Math.min(46, Math.round(W / 26));
        for (var j = 0; j < petalCount; j++) petals.push(newPetal(rand(-H, H)));

        orbs = [];
        for (var k = 0; k < 9; k++) {
            orbs.push({ x: rand(0, W), y: rand(H * .35, H), r: rand(28, 78), p: rand(0, 6.28), vy: rand(.04, .16), hue: Math.random() < .5 ? "255,122,184" : "126,232,255" });
        }

        city = [];
        var far = [], near = [], x = -40;
        while (x < W + 60) {
            var w1 = rand(26, 58), h1 = rand(H * .10, H * .22);
            far.push({ x: x, w: w1, h: h1 }); x += w1 + rand(6, 22);
        }
        x = -60;
        while (x < W + 80) {
            var w2 = rand(40, 92), h2 = rand(H * .16, H * .34);
            var wins = [];
            for (var wy = 12; wy < h2 - 14; wy += 16) {
                for (var wx = 8; wx < w2 - 12; wx += 14) {
                    if (Math.random() < .42) wins.push({ x: wx, y: wy, p: rand(0, 6.28), warm: Math.random() < .6 });
                }
            }
            near.push({ x: x, w: w2, h: h2, wins: wins, sign: Math.random() < .3 });
            x += w2 + rand(10, 30);
        }
        city = [far, near];
    }

    function newPetal(y) {
        return {
            x: rand(-40, W + 40), y: y, s: rand(5, 12), vy: rand(.28, .85), vx: rand(-.35, .35),
            rot: rand(0, 6.28), vr: rand(-.02, .02), sway: rand(.4, 1.6), p: rand(0, 6.28),
            tint: Math.random() < .3 ? [255, 214, 233] : [255, 122, 184], a: rand(.4, .9)
        };
    }

    function petal(pt) {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.globalAlpha = pt.a;
        var g = ctx.createLinearGradient(0, -pt.s, 0, pt.s);
        g.addColorStop(0, "rgba(" + pt.tint.join(",") + ",.95)");
        g.addColorStop(1, "rgba(255,122,184,.28)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -pt.s * .55);
        ctx.bezierCurveTo(pt.s * .85, -pt.s * .55, pt.s * .7, pt.s * .55, 0, pt.s * .6);
        ctx.bezierCurveTo(-pt.s * .7, pt.s * .55, -pt.s * .85, -pt.s * .55, 0, -pt.s * .55);
        ctx.fill();
        ctx.restore();
    }

    function frame() {
        t += 1;
        ctx.clearRect(0, 0, W, H);

        /* bintang */
        for (var i = 0; i < stars.length; i++) {
            var st = stars[i];
            var tw = .45 + .55 * Math.abs(Math.sin(t / 60 * st.s + st.p));
            ctx.globalAlpha = tw;
            ctx.fillStyle = "#dfe6ff";
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, 6.283);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* bulan */
        var mx = W * .79, my = H * .17, mr = Math.max(46, Math.min(W, H) * .07);
        var halo = ctx.createRadialGradient(mx, my, mr * .4, mx, my, mr * 3.4);
        halo.addColorStop(0, "rgba(255,236,247,.24)");
        halo.addColorStop(1, "rgba(255,236,247,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
        var moon = ctx.createLinearGradient(mx - mr, my - mr, mx + mr, my + mr);
        moon.addColorStop(0, "#fff6fb");
        moon.addColorStop(1, "#f0cfe6");
        ctx.fillStyle = moon;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = "rgba(190,160,190,.16)";
        [[.3, -.2, .16], [-.2, .28, .11], [.1, .4, .08]].forEach(function (c) {
            ctx.beginPath();
            ctx.arc(mx + mr * c[0], my + mr * c[1], mr * c[2], 0, 6.283);
            ctx.fill();
        });

        /* kabut cahaya */
        for (var o = 0; o < orbs.length; o++) {
            var ob = orbs[o];
            ob.y -= ob.vy;
            if (ob.y < -ob.r) ob.y = H + ob.r;
            var pulse = .06 + .05 * Math.sin(t / 90 + ob.p);
            var og = ctx.createRadialGradient(ob.x, ob.y, 0, ob.x, ob.y, ob.r);
            og.addColorStop(0, "rgba(" + ob.hue + "," + pulse + ")");
            og.addColorStop(1, "rgba(" + ob.hue + ",0)");
            ctx.fillStyle = og;
            ctx.fillRect(ob.x - ob.r, ob.y - ob.r, ob.r * 2, ob.r * 2);
        }

        /* skyline */
        var farRow = city[0], nearRow = city[1];
        ctx.fillStyle = "rgba(30,26,66,.9)";
        farRow.forEach(function (b) { ctx.fillRect(b.x, H - b.h, b.w, b.h); });
        ctx.fillStyle = "rgba(11,14,36,.97)";
        nearRow.forEach(function (b) { ctx.fillRect(b.x, H - b.h, b.w, b.h); });
        nearRow.forEach(function (b) {
            b.wins.forEach(function (w) {
                if (w.y > b.h - 8) return;
                var on = .35 + .65 * Math.abs(Math.sin(t / 200 + w.p));
                ctx.fillStyle = w.warm ? "rgba(255,210,122," + on * .85 + ")" : "rgba(126,232,255," + on * .6 + ")";
                ctx.fillRect(b.x + w.x, H - b.h + w.y, 5, 8);
            });
            if (b.sign) {
                ctx.fillStyle = "rgba(255,122,184," + (.28 + .22 * Math.sin(t / 40)) + ")";
                ctx.fillRect(b.x + 6, H - b.h + 6, b.w - 12, 3);
            }
        });

        /* garis neon cakrawala */
        var line = ctx.createLinearGradient(0, H - 60, 0, H);
        line.addColorStop(0, "rgba(255,122,184,0)");
        line.addColorStop(1, "rgba(255,122,184,.16)");
        ctx.fillStyle = line;
        ctx.fillRect(0, H - 60, W, 60);

        /* malaikat sakura */
        for (var p = 0; p < petals.length; p++) {
            var pt = petals[p];
            pt.y += pt.vy;
            pt.x += pt.vx + Math.sin(t / 70 + pt.p) * pt.sway * .5;
            pt.rot += pt.vr;
            if (pt.y - 20 > H || pt.x < -60 || pt.x > W + 60) petals[p] = newPetal(rand(-80, -10));
            else petal(pt);
        }

        /* bintang jatuh */
        if (!shooting && t % 420 === 0) shooting = { x: rand(W * .1, W * .8), y: rand(H * .05, H * .35), life: 0 };
        if (shooting) {
            shooting.life++;
            var d = shooting.life * 7;
            var fade = Math.max(0, 1 - shooting.life / 46);
            ctx.strokeStyle = "rgba(255,255,255," + fade * .8 + ")";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(shooting.x + d, shooting.y + d * .55);
            ctx.lineTo(shooting.x + d - 70, shooting.y + d * .55 - 38);
            ctx.stroke();
            if (shooting.life > 46) shooting = null;
        }

        if (!prefersReduced) raf = requestAnimationFrame(frame);
    }

    var raf = null;
    build();
    frame();

    var rt;
    window.addEventListener("resize", function () {
        clearTimeout(rt);
        rt = setTimeout(function () { build(); if (prefersReduced) frame(); }, 180);
    });

    document.addEventListener("visibilitychange", function () {
        if (prefersReduced) return;
        if (document.hidden) {
            cancelAnimationFrame(raf);
            raf = null;
        } else if (!raf) {
            raf = requestAnimationFrame(frame);
        }
    });
})();
