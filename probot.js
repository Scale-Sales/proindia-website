/* ============================================================
   Pro India — ProBot
   Menu-driven, CTA-first popup assistant.
   - Menu / sub-menu / Back / Home navigation
   - Captures Name, Email, WhatsApp -> Zoho Flow webhook
   - WhatsApp handoff (same tree can drive Gupshup WA bot + IVR)
   - Fires GTM dataLayer events for engagement scoring
   Drop-in: <script defer src="probot.js"></script>
   ============================================================ */
(function () {
  "use strict";

  // ---- CONFIG (edit these) ----
  var CONFIG = {
    waNumber: "919319001214",                 // WhatsApp / missed-call number (no +)
    zohoWebhook: "https://flow.zoho.in/YOUR_ZOHO_FLOW_WEBHOOK_URL", // Zoho Flow -> Zoho Campaigns
    brand: "#0d3b2e", accent: "#f5a623", green: "#1db954", wa: "#25D366",
    logo: "https://proindia.net/wp-content/uploads/2020/05/ProIndia-Solutions-Logo_stamp1-e1588359956550-150x150.png"
  };

  // ---- MENU TREE (mirrors probot-menu.json; reuse for WhatsApp + IVR) ----
  // node: { id, msg, options:[{label,goto|url|action}] }  action: 'lead' | 'human'
  var MENU = {
    root: {
      msg: "Hi! I'm ProBot 🤖 — I'll point you to the right Pro India service in a few taps. What brings you here?",
      options: [
        { label: "🌍 ESG for my company (B2B)", goto: "esg" },
        { label: "🎓 ESG Training / Certification", goto: "training" },
        { label: "♻️ EPR Compliance", goto: "epr" },
        { label: "🏭 MSME Support & Growth", goto: "msme" },
        { label: "📞 Talk to a Pro India", action: "human", tag: "Talk to a Pro India", msg: "We would reach you — please provide your details." }
      ]
    },
    esg: {
      msg: "ESG for your company — which do you need?",
      options: [
        { label: "Net Zero / Footprinting", url: "esg-services.html#consultancy", tag: "ESG Consultancy" },
        { label: "BRSR / CBAM / Reporting", url: "esg-services.html#reporting", tag: "ESG Reporting" },
        { label: "Carbon / Water / Waste Audit", url: "esg-services.html#audits", tag: "ESG Audit" },
        { label: "Corporate ESG Training", url: "esg-services.html#training", tag: "Corporate ESG Training" },
        { label: "🗓 Book a free ESG assessment", action: "lead", tag: "ESG - Book Assessment" }
      ]
    },
    training: {
      msg: "Great — learning & certification. Pick one:",
      options: [
        { label: "Executive ESG Certification", url: "esg-training.html", tag: "Exec ESG Cert" },
        { label: "Student ESG Program", url: "esg-training.html#student", tag: "Student ESG" },
        { label: "Coaching & Mentoring (EIR)", url: "esg-training.html", tag: "Coaching/EIR" },
        { label: "Campus Ambassador", url: "esg-training.html#student", tag: "Campus Ambassador" },
        { label: "🗓 Talk to a training advisor", action: "lead", tag: "Training - Advisor" }
      ]
    },
    epr: {
      msg: "EPR compliance — what applies to you?",
      options: [
        { label: "Plastic EPR", url: "epr-compliance.html#plastic", tag: "Plastic EPR" },
        { label: "E-Waste / Battery / Tyre", url: "epr-compliance.html#ewaste", tag: "E-Waste/Battery/Tyre EPR" },
        { label: "🧮 Check my penalty risk", url: "epr-compliance.html#calculator", tag: "EPR Calculator" },
        { label: "Registration → Annual Filing", url: "epr-compliance.html", tag: "EPR Filing" },
        { label: "🗓 Talk to an EPR expert", action: "lead", tag: "EPR - Expert" }
      ]
    },
    msme: {
      msg: "MSME support — where can we help?",
      options: [
        { label: "Supply-Chain Sustainability", url: "msme-support.html#supply-chain", tag: "SCM Sustainability" },
        { label: "SCALE — Growth & Coaching", url: "msme-support.html#scale", tag: "SCALE" },
        { label: "Franchising", url: "franchise.html", tag: "Franchise" },
        { label: "🗓 Talk to us about growth", action: "lead", tag: "MSME - Growth" }
      ]
    }
  };

  // ---- STYLES ----
  var css = "" +
  ".pib-launch{position:fixed;right:24px;bottom:150px;z-index:99998;display:flex;align-items:center;gap:9px;background:" + CONFIG.brand + ";color:#fff;border:none;border-radius:50px;padding:12px 18px;font:600 14px/1 Inter,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;transition:transform .15s}" +
  ".pib-launch:hover{transform:scale(1.05)}" +
  ".pib-launch .d{width:9px;height:9px;border-radius:50%;background:" + CONFIG.green + ";box-shadow:0 0 0 0 rgba(29,185,84,.6);animation:pibpulse 2s infinite}" +
  "@keyframes pibpulse{0%{box-shadow:0 0 0 0 rgba(29,185,84,.6)}70%{box-shadow:0 0 0 8px rgba(29,185,84,0)}100%{box-shadow:0 0 0 0 rgba(29,185,84,0)}}" +
  ".pib-panel{position:fixed;right:24px;bottom:24px;z-index:99999;width:370px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 40px);background:#fff;border-radius:18px;box-shadow:0 16px 50px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif}" +
  ".pib-panel.open{display:flex;animation:pibin .2s ease}" +
  "@keyframes pibin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}" +
  ".pib-head{background:" + CONFIG.brand + ";color:#fff;padding:14px 16px;display:flex;align-items:center;gap:11px}" +
  ".pib-head img{width:38px;height:38px;border-radius:50%;background:#fff;object-fit:contain}" +
  ".pib-head .t{font-weight:700;font-size:15px;line-height:1.1}" +
  ".pib-head .s{font-size:11.5px;opacity:.8;display:flex;align-items:center;gap:5px}" +
  ".pib-head .s .dot{width:7px;height:7px;border-radius:50%;background:" + CONFIG.green + "}" +
  ".pib-x{margin-left:auto;background:rgba(255,255,255,.15);border:none;color:#fff;width:28px;height:28px;border-radius:8px;font-size:16px;cursor:pointer}" +
  ".pib-body{flex:1;overflow-y:auto;padding:16px;background:#f6f9f7;display:flex;flex-direction:column;gap:10px}" +
  ".pib-bot,.pib-user{max-width:85%;padding:10px 13px;font-size:13.5px;line-height:1.5;border-radius:14px}" +
  ".pib-bot{background:#fff;color:#22312b;border:1px solid #e2e8f0;border-top-left-radius:4px;align-self:flex-start}" +
  ".pib-user{background:" + CONFIG.brand + ";color:#fff;border-top-right-radius:4px;align-self:flex-end}" +
  ".pib-opts{display:flex;flex-direction:column;gap:7px;align-self:flex-start;width:100%}" +
  ".pib-opt{text-align:left;background:#fff;border:1.5px solid " + CONFIG.green + ";color:" + CONFIG.brand + ";border-radius:11px;padding:10px 13px;font:600 13px/1.35 Inter,sans-serif;cursor:pointer;transition:.12s}" +
  ".pib-opt:hover{background:" + CONFIG.green + ";color:#fff}" +
  ".pib-nav{display:flex;gap:7px}" +
  ".pib-nav button{flex:1;background:#eef2ef;border:none;color:#516;color:#4a5568;border-radius:10px;padding:9px;font:600 12.5px Inter,sans-serif;cursor:pointer}" +
  ".pib-nav button:hover{background:#e2e8f0}" +
  ".pib-cta{display:flex;flex-direction:column;gap:7px;width:100%}" +
  ".pib-cta a,.pib-cta button{display:flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;border:none;border-radius:11px;padding:11px;font:700 13px Inter,sans-serif;cursor:pointer}" +
  ".pib-cta .open{background:" + CONFIG.accent + ";color:#fff}" +
  ".pib-cta .wa{background:" + CONFIG.wa + ";color:#fff}" +
  ".pib-cta .lead{background:" + CONFIG.brand + ";color:#fff}" +
  ".pib-form{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;width:100%;display:flex;flex-direction:column;gap:9px}" +
  ".pib-form label{font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:.04em}" +
  ".pib-form input{border:1.5px solid #e2e8f0;border-radius:9px;padding:10px 12px;font-size:13.5px;font-family:Inter,sans-serif}" +
  ".pib-form input:focus{outline:none;border-color:" + CONFIG.green + "}" +
  ".pib-form .send{background:" + CONFIG.accent + ";color:#fff;border:none;border-radius:10px;padding:11px;font:700 13.5px Inter,sans-serif;cursor:pointer;margin-top:2px}" +
  ".pib-foot{text-align:center;font-size:10.5px;color:#a0aec0;padding:8px}" +
  ".pib-foot a{color:#a0aec0}";

  // ---- helpers ----
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function track(ev, data) { try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event: ev }, data || {})); } catch (e) {} }
  function waLink(text) { return "https://wa.me/" + CONFIG.waNumber + "?text=" + encodeURIComponent(text); }

  var state = { history: [], lastTag: "" };
  var body, panel, launcher;

  function scrollDown() { body.scrollTop = body.scrollHeight; }
  function addBot(msg) { var b = el("div", "pib-bot", msg); body.appendChild(b); scrollDown(); return b; }
  function addUser(msg) { var b = el("div", "pib-user", msg); body.appendChild(b); scrollDown(); }

  function renderNav() {
    var nav = el("div", "pib-nav");
    if (state.history.length) {
      var back = el("button", null, "⬅ Back"); back.onclick = goBack; nav.appendChild(back);
    }
    var home = el("button", null, "🏠 Main menu"); home.onclick = goHome; nav.appendChild(home);
    body.appendChild(nav); scrollDown();
  }

  function showNode(id) {
    var node = MENU[id]; if (!node) return;
    addBot(node.msg);
    var wrap = el("div", "pib-opts");
    node.options.forEach(function (opt) {
      var b = el("button", "pib-opt", opt.label);
      b.onclick = function () { chooseOption(id, opt); };
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    renderNav();
  }

  function chooseOption(fromId, opt) {
    addUser(opt.label);
    track("probot_select", { probot_from: fromId, probot_choice: opt.label });
    if (opt.goto) { state.history.push(fromId); showNode(opt.goto); return; }
    if (opt.action === "human") { state.history.push(fromId); leadForm("Talk to a human", true); return; }
    if (opt.action === "lead") { state.history.push(fromId); state.lastTag = opt.tag || fromId; leadForm(opt.tag || "Enquiry", false); return; }
    if (opt.url) { state.lastTag = opt.tag || ""; leafCTA(opt); return; }
  }

  function leafCTA(opt) {
    addBot("Here's the best next step for <b>" + (opt.tag || "this") + "</b>:");
    var cta = el("div", "pib-cta");
    var open = el("a", "open", "📄 Open the page →"); open.href = opt.url; open.onclick = function () { track("probot_visit", { probot_choice: opt.tag }); };
    var wa = el("a", "wa", "💬 Chat on WhatsApp"); wa.href = waLink("Hi Pro India, I'm interested in: " + (opt.tag || "your services")); wa.target = "_blank"; wa.rel = "noopener";
    wa.onclick = function () { track("probot_whatsapp", { probot_choice: opt.tag }); };
    var lead = el("button", "lead", "📝 Leave my details"); lead.onclick = function () { state.lastTag = opt.tag || ""; leadForm(opt.tag || "Enquiry", false); };
    cta.appendChild(open); cta.appendChild(wa); cta.appendChild(lead);
    body.appendChild(cta);
    renderNav();
  }

  function leadForm(tag, human) {
    addBot(human
      ? "Happy to connect you. Leave your details and our team will reach out within 24 hours (WhatsApp + email)."
      : "Sure — share your details for <b>" + tag + "</b> and we'll get back within 24 hours.");
    var f = el("div", "pib-form");
    f.innerHTML =
      '<div><label>Name</label><input id="pibName" placeholder="Your name" autocomplete="name"></div>' +
      '<div><label>Email</label><input id="pibEmail" type="email" placeholder="you@company.com" autocomplete="email"></div>' +
      '<div><label>WhatsApp number</label><input id="pibWa" type="tel" placeholder="+91 9xxxxxxxxx" autocomplete="tel"></div>' +
      '<button class="send" id="pibSend">Send & get a callback</button>';
    body.appendChild(f); scrollDown();
    f.querySelector("#pibSend").onclick = function () { submitLead(tag); };
  }

  function submitLead(tag) {
    var name = (document.getElementById("pibName") || {}).value || "";
    var email = (document.getElementById("pibEmail") || {}).value || "";
    var wa = (document.getElementById("pibWa") || {}).value || "";
    if (!name.trim() || (!email.trim() && !wa.trim())) { alert("Please enter your name and email or WhatsApp number."); return; }
    var payload = {
      name: name, email: email, whatsapp: wa,
      interest: tag, path: state.lastTag || tag,
      source: "ProBot", page: location.href, ts: new Date().toISOString()
    };
    // Transfer to Zoho (Flow -> Campaigns/CRM). no-cors: fire & forget.
    try { fetch(CONFIG.zohoWebhook, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); } catch (e) {}
    track("probot_lead", { probot_choice: tag });
    addUser(name + (wa ? " · " + wa : ""));
    addBot("✅ Thank you, <b>" + (name.split(" ")[0] || "there") + "</b>! You're in — our team will reach out within 24 hours. Prefer to chat now?");
    var cta = el("div", "pib-cta");
    var waBtn = el("a", "wa", "💬 Continue on WhatsApp");
    waBtn.href = waLink("Hi Pro India, I'm " + name + ". I enquired about: " + (tag || "your services"));
    waBtn.target = "_blank"; waBtn.rel = "noopener";
    cta.appendChild(waBtn); body.appendChild(cta);
    renderNav();
  }

  function goBack() { var prev = state.history.pop(); showNode(prev || "root"); }
  function goHome() { state.history = []; showNode("root"); }

  function openPanel() {
    panel.classList.add("open");
    if (!body.dataset.started) { body.dataset.started = "1"; showNode("root"); track("probot_open", {}); }
  }
  function closePanel() { panel.classList.remove("open"); }

  // ---- build DOM ----
  function build() {
    var style = el("style"); style.textContent = css; document.head.appendChild(style);

    // Always inject our own fresh launcher.
    launcher = el("button", "pib-launch", '<span class="d"></span> Chat with us');
    launcher.setAttribute("aria-label", "Open Pro India assistant");
    launcher.onclick = openPanel;
    document.body.appendChild(launcher);
    // Also let any element with data-probot-open trigger it.
    document.querySelectorAll("[data-probot-open]").forEach(function (n) {
      n.addEventListener("click", function (e) { e.preventDefault(); openPanel(); });
    });

    panel = el("div", "pib-panel");
    var head = el("div", "pib-head",
      '<img src="' + CONFIG.logo + '" alt="Pro India"><div><div class="t">Pro India Assistant</div><div class="s"><span class="dot"></span> Online · replies in 24h</div></div>');
    var x = el("button", "pib-x", "×"); x.onclick = closePanel; head.appendChild(x);
    body = el("div", "pib-body");
    var foot = el("div", "pib-foot", "Powered by Pro India · <a href='privacy-policy.html'>Privacy</a>");
    panel.appendChild(head); panel.appendChild(body); panel.appendChild(foot);
    document.body.appendChild(panel);

    // Auto-invite after 12s (once per session)
    try {
      if (!sessionStorage.getItem("pibInvited")) {
        setTimeout(function () { if (launcher && !panel.classList.contains("open")) { launcher.style.transform = "scale(1.08)"; setTimeout(function () { launcher.style.transform = ""; }, 1200); } sessionStorage.setItem("pibInvited", "1"); }, 12000);
      }
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
