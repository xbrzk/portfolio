const $ = (id) => document.getElementById(id);

// ===== Ganti tema =====
const tombolTema = $("tema");

function setTema(gelap) {
    document.body.classList.toggle("dark", gelap);
    tombolTema.textContent = gelap ? "🌙" : "☀";
}

try { setTema(localStorage.getItem("tema") === "gelap"); } catch (e) {}

tombolTema.addEventListener("click", () => {
    const gelap = !document.body.classList.contains("dark");
    setTema(gelap);
    try { localStorage.setItem("tema", gelap ? "gelap" : "terang"); } catch (e) {}
});

// ===== Teks berjalan: isi otomatis dari atribut data-teks =====
document.querySelectorAll(".marquee-isi[data-teks]").forEach((el) => {
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<span>${el.dataset.teks}</span>`.repeat(8);
});

// ===== Efek ketik lalu hapus satu per satu =====
const kata = ["Frontend Developer", "Web Developer", "UI Designer"];
const elKetik = $("ketik");
let k = 0, h = 0, hapus = false;

function ketik() {
    const t = kata[k];
    elKetik.textContent = t.substring(0, h);

    if (!hapus) {
        h++;
        if (h > t.length) { hapus = true; return setTimeout(ketik, 1500); }
    } else {
        h--;
        if (h < 0) { hapus = false; h = 0; k = (k + 1) % kata.length; }
    }
    setTimeout(ketik, hapus ? 50 : 100);
}

// ===== Loading screen + animasi muncul =====
window.addEventListener("load", () => {
    setTimeout(() => {
        $("loader").classList.add("hide");
        document.body.classList.add("loaded");

        const observer = new IntersectionObserver((items) => {
            items.forEach((item) => {
                if (!item.isIntersecting) return;
                item.target.classList.add("tampil");
                observer.unobserve(item.target);
            });
        }, { threshold: 0.2 });
        document.querySelectorAll(".muncul").forEach((e) => observer.observe(e));

        ketik();
    }, 1500);
});

// ===== Menu navigasi: hamburger + penanda seksi aktif =====
const hamburger = $("hamburger");
const navLinks = document.querySelector(".nav-links");
const linkNav = [...navLinks.querySelectorAll("a")];

function tutupMenu() {
    hamburger.classList.remove("aktif");
    navLinks.classList.remove("buka");
}

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("aktif");
    navLinks.classList.toggle("buka");
});
linkNav.forEach((a) => a.addEventListener("click", tutupMenu));

const spy = new IntersectionObserver((items) => {
    items.forEach((item) => {
        if (!item.isIntersecting) return;
        linkNav.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + item.target.id));
    });
}, { rootMargin: "-40% 0px -55% 0px" });
linkNav.forEach((a) => {
    const seksi = document.querySelector(a.getAttribute("href"));
    if (seksi) spy.observe(seksi);
});

// ===== Asisten AI =====
const jawaban = [
    { kunci: ["halo", "hai", "hi", "hello"],
      balas: "Halo! Saya asisten Rizki. Silakan tanya soal skill, kontak, atau portofolionya." },
    { kunci: ["siapa", "tentang", "about"],
      balas: "Rizki adalah web developer pemula yang suka ngoding dan bereksperimen dengan ide-ide baru." },
    { kunci: ["skill", "bisa", "bahasa", "teknologi", "keahlian"],
      balas: "Rizki sedang mendalami HTML, CSS, dan JavaScript, dengan fokus ke frontend." },
    { kunci: ["wa", "whatsapp", "nomor", "kontak", "hubungi"],
      balas: 'Hubungi lewat WhatsApp: <a href="https://wa.me/62895408104500" target="_blank">klik di sini</a>.' },
    { kunci: ["instagram", "ig"],
      balas: 'Instagram: <a href="https://www.instagram.com/xb.rzki" target="_blank">@xb.rzki</a>' },
    { kunci: ["tiktok"],
      balas: 'TikTok: <a href="https://www.tiktok.com/@labs" target="_blank">@labs</a>' },
    { kunci: ["cv", "resume"],
      balas: "CV belum tersedia saat ini, tapi segera ditambahkan." },
    { kunci: ["proyek", "project", "karya", "portofolio"],
      balas: "Bagian Projects sedang disiapkan. Nantikan karya terbaru Rizki ya!" }
];
const bawaan = "Maaf, saya belum paham pertanyaannya. Coba tanya soal skill, kontak, atau media sosial Rizki.";

const aiPanel = $("ai-panel");
const aiPesan = $("ai-pesan");
const aiInput = $("ai-input");

function tambahPesan(teks, jenis, html) {
    const d = document.createElement("div");
    d.className = "ai-msg " + jenis;
    d[html ? "innerHTML" : "textContent"] = teks;
    aiPesan.appendChild(d);
    aiPesan.scrollTop = aiPesan.scrollHeight;
}

// Kata kunci pendek (<=3 huruf) harus cocok persis; yang panjang boleh sebagian
function cariJawaban(tanya) {
    const kataTanya = tanya.toLowerCase().split(/\W+/);
    return jawaban.find((j) =>
        j.kunci.some((kunci) => kataTanya.some((w) => w === kunci || (kunci.length > 3 && w.includes(kunci))))
    );
}

$("ai-btn").addEventListener("click", () => {
    aiPanel.classList.toggle("buka");
    if (aiPanel.classList.contains("buka") && !aiPesan.children.length) {
        tambahPesan("Halo! Saya asisten Rizki. Mau tanya apa?", "bot");
    }
});
$("ai-tutup").addEventListener("click", () => aiPanel.classList.remove("buka"));

$("ai-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const tanya = aiInput.value.trim();
    if (!tanya) return;
    tambahPesan(tanya, "user");
    aiInput.value = "";
    const cocok = cariJawaban(tanya);
    setTimeout(() => tambahPesan(cocok ? cocok.balas : bawaan, "bot", true), 500);
});

// ===== Kartu ID gantung: tarik, ayun, lempar, klik untuk membalik =====
// Tali = rantai titik (verlet). Titik terakhir adalah pusat kartu yang berat.
(() => {
    const stage = $("lanyard");
    const canvas = $("lanyardCanvas");
    const card = $("lanyardCard");
    if (!stage || !canvas || !card) return;

    const ctx = canvas.getContext("2d");
    const SISI_MAX = 800;                  // area ayun boleh melebar sejauh ini ke kiri/kanan
    const GRAVITY = 0.55, DAMP = 0.992, ITER = 14, STEP = 1000 / 60;
    const IM_ROPE = 1, IM_CLIP = 0.5, IM_CARD = 0.12; // 1 / massa: makin kecil makin berat

    let W, H, ox, ext, sw, cw, ch, pts, rest, reach, warna, kunci;
    let drag = null, running = false, last = 0, acc = 0, sudahAyun = false;

    function bacaWarna() {
        const s = getComputedStyle(document.body);
        warna = {
            tali: s.getPropertyValue("--accent").trim() || "#1a1a2e",
            garis: s.getPropertyValue("--accent-text").trim() || "#fff"
        };
    }

    // posisi & ukuran stage di halaman (tidak terpengaruh animasi "muncul")
    function ukur() {
        let x = 0, y = 0;
        for (let el = stage; el; el = el.offsetParent) { x += el.offsetLeft; y += el.offsetTop; }
        return { x, y, vw: document.documentElement.clientWidth, sw: stage.offsetWidth, sh: stage.offsetHeight };
    }

    function setup() {
        const u = ukur();
        kunci = [u.x, u.y, u.vw, u.sw, u.sh].join("|");

        // canvas melebar ke kiri/kanan sampai tepi layar & ke atas sampai bawah navbar
        const kiri = Math.min(u.x, SISI_MAX);
        const kanan = Math.min(Math.max(0, u.vw - u.x - u.sw), SISI_MAX);
        const diAtas = u.y < 300;          // hero tampil di atas halaman (desktop)
        ox = kiri;
        sw = u.sw;
        ext = diAtas ? Math.max(40, u.y - 40) : 90;
        W = u.sw + kiri + kanan;
        H = u.sh + ext;

        canvas.style.left = -kiri + "px";
        canvas.style.top = -ext + "px";
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        // saat tali tidak muncul dari bawah navbar (HP), ujung atasnya dipudarkan
        canvas.style.webkitMaskImage = canvas.style.maskImage = diAtas ? "none" : "linear-gradient(to bottom, transparent, #000 70px)";

        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cw = card.offsetWidth;
        ch = card.offsetHeight;

        const tali = ext + u.sh * 0.22, seg = tali / 5, ax = ox + sw / 2;
        pts = [];
        for (let i = 0; i <= 5; i++) {
            pts.push({ x: ax, y: i * seg, im: i === 0 ? 0 : i === 5 ? IM_CLIP : IM_ROPE });
        }
        pts.push({ x: ax, y: tali + ch / 2, im: IM_CARD }); // pusat kartu
        pts.forEach((p) => { p.px = p.x; p.py = p.y; });

        rest = [seg, seg, seg, seg, seg, ch / 2];
        reach = tali + ch / 2;             // panjang maksimum sampai ujung tali
    }

    // sudut kartu mengikuti arah dari penjepit ke pusat kartu
    const sudut = () => Math.atan2(-(pts[6].x - pts[5].x), pts[6].y - pts[5].y);

    // memantul pelan saat menabrak batas
    function batas(p, minX, maxX, minY = -Infinity) {
        if (p.x < minX) { const v = p.x - p.px; p.x = minX; p.px = p.x + v * 0.4; }
        else if (p.x > maxX) { const v = p.x - p.px; p.x = maxX; p.px = p.x + v * 0.4; }
        if (p.y < minY) { const v = p.y - p.py; p.y = minY; p.py = p.y + v * 0.4; }
    }
    const batasAtas = () => ext + ch / 2 - 40; // kartu tidak naik sampai tertutup navbar

    function step() {
        const c = pts[6];
        c.im = drag ? 0 : IM_CARD;

        for (let i = 1; i < pts.length; i++) {
            if (i === 6 && drag) continue;
            const p = pts[i];
            const vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP;
            p.px = p.x; p.py = p.y;
            p.x += vx;
            p.y += vy + GRAVITY;
        }

        if (drag) {
            // kartu mengikuti kursor di titik yang tadi dipegang
            const a = sudut(), cos = Math.cos(a), sin = Math.sin(a);
            let tx = drag.x - (drag.ox * cos - drag.oy * sin);
            let ty = drag.y - (drag.ox * sin + drag.oy * cos);
            ty = Math.max(ty, batasAtas());

            // tidak bisa ditarik lebih jauh dari ujung tali
            const d = Math.hypot(tx - pts[0].x, ty - pts[0].y), max = reach * 0.99;
            if (d > max) { tx = pts[0].x + (tx - pts[0].x) * max / d; ty = pts[0].y + (ty - pts[0].y) * max / d; }

            // kecepatan gerak dipakai saat dilepas, jadi kartu bisa dilempar
            let mx = tx - c.x, my = ty - c.y;
            const m = Math.hypot(mx, my);
            if (m > 40) { mx *= 40 / m; my *= 40 / m; }
            c.px = c.x; c.py = c.y;
            c.x += mx; c.y += my;
        }

        for (let k = 0; k < ITER; k++) {
            for (let i = 0; i < 6; i++) {
                const a = pts[i], b = pts[i + 1];
                const w = a.im + b.im;
                if (!w) continue;
                const dx = b.x - a.x, dy = b.y - a.y;
                const d = Math.hypot(dx, dy) || 0.0001;
                const diff = (d - rest[i]) / d / w;
                a.x += dx * diff * a.im; a.y += dy * diff * a.im;
                b.x -= dx * diff * b.im; b.y -= dy * diff * b.im;
            }
        }

        for (let i = 1; i < 6; i++) batas(pts[i], 6, W - 6);
        batas(c, cw / 2, W - cw / 2, batasAtas());
    }

    function gambar() {
        ctx.clearRect(0, 0, W, H);

        // tali: kurva halus melewati titik-titik
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < 5; i++) {
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
        }
        ctx.lineTo(pts[5].x, pts[5].y);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = warna.tali;
        ctx.lineWidth = 14;
        ctx.stroke();
        ctx.setLineDash([5, 9]);
        ctx.strokeStyle = warna.garis;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // kartu (elemen HTML) dipindah & diputar mengikuti titik pusat
        const c = pts[6];
        card.style.transform = `translate(${c.x - ox - cw / 2}px, ${c.y - ext - ch / 2}px) rotate(${sudut()}rad)`;
    }

    function frame(t) {
        if (!running) return;
        acc += Math.min(50, t - last);
        last = t;
        while (acc >= STEP) { step(); acc -= STEP; }
        gambar();
        requestAnimationFrame(frame);
    }
    function mulai() {
        if (running) return;
        running = true; last = performance.now(); acc = 0;
        requestAnimationFrame(frame);
    }

    // ----- Pointer: tarik, lempar, klik untuk membalik -----
    function titik(e) {
        const r = stage.getBoundingClientRect();
        return { x: e.clientX - r.left + ox, y: e.clientY - r.top + ext };
    }

    card.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        card.setPointerCapture(e.pointerId);
        const t = titik(e), c = pts[6], a = sudut();
        const dx = t.x - c.x, dy = t.y - c.y, cos = Math.cos(-a), sin = Math.sin(-a);
        drag = {
            id: e.pointerId, x: t.x, y: t.y,
            ox: dx * cos - dy * sin, oy: dx * sin + dy * cos, // titik pegangan di dalam kartu
            sx: e.clientX, sy: e.clientY, moved: false
        };
        card.classList.add("is-grabbed");
        e.preventDefault();
    });

    card.addEventListener("pointermove", (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const t = titik(e);
        drag.x = t.x; drag.y = t.y;
        if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
    });

    const lepas = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.moved && e.type === "pointerup") card.classList.toggle("flipped"); // klik = balik kartu
        drag = null;
        card.classList.remove("is-grabbed");
    };
    card.addEventListener("pointerup", lepas);
    card.addEventListener("pointercancel", lepas);

    // ----- Jalan hanya saat terlihat; ikut ganti tema; ayunan pertama saat loading selesai -----
    window.addEventListener("resize", () => {
        const u = ukur();
        if ([u.x, u.y, u.vw, u.sw, u.sh].join("|") !== kunci) { setup(); gambar(); }
    });
    new MutationObserver(() => {
        bacaWarna();
        if (!sudahAyun && document.body.classList.contains("loaded")) {
            sudahAyun = true;
            setup();
            gambarf();
            pts[6].px -= 14;               // dorongan awal: kartu berayun saat halaman terbuka
        }
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    new IntersectionObserver(([e]) => { if (e.isIntersecting) mulai(); else running = false; }).observe(stage);

    bacaWarna();
    setup();
    gambar();
})(); 