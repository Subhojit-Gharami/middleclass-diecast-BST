const DATA_URL = "data/listings.json";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
let allListings = [];
let activeType = "ALL";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function cleanExpired(listings) {
  const now = Date.now();
  return listings.filter(x => {
    const posted = new Date(x.postedAt).getTime();
    const expiry = x.expiresAt ? new Date(x.expiresAt).getTime() : posted + WEEK_MS;
    return Number.isFinite(expiry) && expiry > now;
  });
}
function formatDate(iso) {
  return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(iso));
}
function daysLeft(iso) {
  const n=Math.ceil((new Date(iso).getTime()-Date.now())/86400000);
  return n<=1 ? "Expires within 1 day" : `${n} days left`;
}
function contactURL(platform,value,url) {
  if(url) return url;
  const v=String(value||"").trim(), p=platform.toLowerCase();
  if(p==="whatsapp"){const d=v.replace(/[^\d]/g,"");return d?`https://wa.me/${d}`:"#";}
  if(p==="instagram") return v.startsWith("http")?v:`https://instagram.com/${v.replace(/^@/,"")}`;
  if(p==="reddit") return v.startsWith("http")?v:`https://reddit.com/user/${v.replace(/^u\//,"")}`;
  if(p==="facebook") return v.startsWith("http")?v:`https://facebook.com/${v.replace(/^@/,"")}`;
  if(p==="phone") return `tel:${v.replace(/\s/g,"")}`;
  return v.startsWith("http")?v:"#";
}
function cardHTML(x){
  const badgeClass=x.type.toLowerCase();
  const contact=(x.contact||[]).map(c=>`<a class="contact-link" target="_blank" rel="noopener" href="${escapeHTML(contactURL(c.platform,c.value,c.url))}">${escapeHTML(c.platform)} ↗</a>`).join("");
  const cityLine=[x.city,x.locality].filter(Boolean).map(escapeHTML).join(" • ");
  let extra="";
  if(x.type==="TRADE") extra=`<div class="havewant"><b>Have:</b> ${escapeHTML(x.have||"—")}<br><b>Want:</b> ${escapeHTML(x.want||"—")}</div>`;
  else if(x.type==="ISO") extra=`<div class="havewant"><b>ISO for:</b> ${escapeHTML(x.want||x.casting||"—")}</div>`;
  else extra=`<div class="havewant"><b>Price:</b> ${escapeHTML(x.price||"Contact seller")}</div>`;
  return `<article class="listing-card">
    <div class="card-top"><span class="badge ${badgeClass}">${escapeHTML(x.type)}</span><span class="listing-id">${escapeHTML(x.id)}</span></div>
    <h3>${escapeHTML(x.casting)}</h3><div class="meta">${escapeHTML(x.brand)} • ${cityLine}</div>
    <p class="card-details">${escapeHTML(x.details)}</p>${extra}
    <div class="contact-list">${contact||`<span class="meta">No contact method supplied</span>`}</div>
    <div class="expiry">Posted ${formatDate(x.postedAt)} • ${daysLeft(x.expiresAt)}</div>
  </article>`;
}
function render(){
  const q=$("#searchInput").value.trim().toLowerCase(), brand=$("#brandFilter").value, city=$("#cityFilter").value, sort=$("#sortFilter").value;
  let items=allListings.filter(x=>{
    const hay=[x.id,x.type,x.owner,x.city,x.locality,x.brand,x.casting,x.details,x.have,x.want,x.price].join(" ").toLowerCase();
    return (activeType==="ALL"||x.type===activeType)&&(!brand||x.brand===brand)&&(!city||x.city===city)&&(!q||hay.includes(q));
  });
  items.sort((a,b)=>sort==="oldest"?new Date(a.postedAt)-new Date(b.postedAt):sort==="expiry"?new Date(a.expiresAt)-new Date(b.expiresAt):new Date(b.postedAt)-new Date(a.postedAt));
  $("#activeCount").textContent=allListings.length;
  $("#listingGrid").innerHTML=items.map(cardHTML).join("");
  $("#emptyState").classList.toggle("hidden",items.length>0);
}
function populateFilters(){
  const brands=[...new Set(allListings.map(x=>x.brand).filter(Boolean))].sort();
  const cities=[...new Set(allListings.map(x=>x.city).filter(Boolean))].sort();
  $("#brandFilter").innerHTML=`<option value="">All brands</option>`+brands.map(x=>`<option>${escapeHTML(x)}</option>`).join("");
  $("#cityFilter").innerHTML=`<option value="">All cities</option>`+cities.map(x=>`<option>${escapeHTML(x)}</option>`).join("");
}
function resetFilters(){
  activeType="ALL";$("#searchInput").value="";$("#brandFilter").value="";$("#cityFilter").value="";$("#sortFilter").value="newest";
  $$(".filter").forEach(b=>b.classList.toggle("active",b.dataset.type==="ALL"));render();
}
function addContactRow(){
  const row=document.createElement("div");row.className="contact-row";
  row.innerHTML=`<select name="contactPlatform" aria-label="Contact platform">
    <option value="Instagram">Instagram</option><option value="WhatsApp">WhatsApp</option><option value="Reddit">Reddit</option>
    <option value="Facebook">Facebook</option><option value="Phone">Phone</option><option value="Other">Other</option>
  </select><input name="contactValue" required maxlength="180" placeholder="@username, number or profile URL">
  <button type="button" class="remove-contact" title="Remove contact">×</button>`;
  row.querySelector(".remove-contact").onclick=()=>{row.remove();};
  $("#contacts").appendChild(row);
}
function updateConditional(){
  const type=document.querySelector('input[name="type"]:checked').value;
  $("#isoFields").classList.toggle("hidden",type!=="ISO");$("#tradeFields").classList.toggle("hidden",type!=="TRADE");$("#sellFields").classList.toggle("hidden",type!=="SELL");
}
async function load(){
  try{
    // Cache-bust so the browser always reads the current JSON.
    const res=await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const data=await res.json();
    allListings=cleanExpired(data.listings||[]);
    populateFilters();render();
  }catch(e){
    $("#listingGrid").innerHTML=`<div class="empty"><h3>Listings could not be loaded</h3><p>Run the included server.py and open http://localhost:8000. A static file:// page cannot fetch JSON reliably.</p></div>`;
  }
}
$$(".filter").forEach(b=>b.onclick=()=>{activeType=b.dataset.type;$$(".filter").forEach(x=>x.classList.toggle("active",x===b));render()});
["searchInput","brandFilter","cityFilter","sortFilter"].forEach(id=>$("#"+id).addEventListener("input",render));
$("#clearFilters").onclick=resetFilters;$("#emptyClear").onclick=resetFilters;
$$('input[name="type"]').forEach(x=>x.addEventListener("change",updateConditional));
$("#addContact").onclick=addContactRow;
addContactRow();updateConditional();

$("#listingForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const f=new FormData(e.target),type=f.get("type");
  const contacts=[...document.querySelectorAll(".contact-row")].map(row=>({platform:row.querySelector('[name="contactPlatform"]').value,value:row.querySelector('[name="contactValue"]').value.trim()})).filter(x=>x.value);
  if(!contacts.length){$("#formMessage").textContent="Please add at least one contact method.";$("#formMessage").className="form-message error";return;}
  const draft={
    type,owner:f.get("owner").trim(),city:f.get("city").trim(),locality:f.get("locality").trim(),contact:contacts,
    brand:f.get("brand").trim(),casting:f.get("casting").trim(),details:f.get("details").trim(),
    want:type==="ISO"?f.get("want").trim():(type==="TRADE"?f.get("wantTrade").trim():""),
    have:type==="TRADE"?f.get("have").trim():"",price:type==="SELL"?f.get("price").trim():""
  };
  try{
    const res=await fetch("/api/add-listing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(draft)});
    const out=await res.json();
    if(!res.ok) throw new Error(out.error||"Could not save listing");
    $("#formMessage").textContent=`${out.id} published successfully. The main JSON has been updated and today's backup was refreshed.`;
    $("#formMessage").className="form-message success";
    e.target.reset();$("#contacts").innerHTML="";addContactRow();updateConditional();await load();
  }catch(err){
    $("#formMessage").textContent=err.message+" — Make sure you opened the site through server.py.";
    $("#formMessage").className="form-message error";
  }
});
load();

const themeButton=$("#themeToggle");
function setTheme(dark){
  document.documentElement.dataset.theme=dark?"dark":"light";
  localStorage.setItem("mcd-theme",dark?"dark":"light");
  themeButton.textContent=dark?"☀ Light":"☾ Dark";
  themeButton.setAttribute("aria-label",dark?"Switch to light theme":"Switch to dark theme");
}
setTheme(localStorage.getItem("mcd-theme")==="dark");
themeButton.onclick=()=>setTheme(document.documentElement.dataset.theme!=="dark");
