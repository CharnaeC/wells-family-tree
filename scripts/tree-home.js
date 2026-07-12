"use strict";
const FOUNDERS = [
  {id:"I500071",label:"Nathaniel Wells",childIds:["I500124","I500296","I500320","I500321","I500093","I500125","I500010","I500073","I500123","I500311","I500177"]},
  {id:"I500194",label:"William Wells",childIds:["I500197","I500239","I500198","I500235","I500196"]}
];
const founderContainer=document.getElementById("founderBranches");
const searchInput=document.getElementById("branchSearch");
const searchButton=document.getElementById("branchSearchButton");
const clearButton=document.getElementById("branchClearButton");
const searchMessage=document.getElementById("branchSearchMessage");
let peopleById=new Map();
function getInitials(name){return (name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(p=>p.charAt(0).toUpperCase()).join("");}
function createPhoto(person,className){
  if(person?.photo){const img=document.createElement("img");img.className=className;img.src=person.photo;img.alt=`${person.displayName} profile`;return img;}
  const span=document.createElement("span");span.className=`${className} person-initials`;span.textContent=getInitials(person?.displayName);return span;
}
async function loadFamilyData(){
  try{const r=await fetch("data/family.json",{cache:"no-store"});if(!r.ok)throw new Error(`Could not load family.json (${r.status})`);const data=await r.json();peopleById=new Map(data.people.map(p=>[p.id,p]));renderFounderBranches();}
  catch(e){console.error(e);founderContainer.innerHTML=`<p class="tree-error">The family branches could not be loaded.</p>`;}
}
function renderFounderBranches(){
  founderContainer.innerHTML="";
  FOUNDERS.forEach(fc=>{
    const founder=peopleById.get(fc.id)||{displayName:fc.label,photo:""};
    const article=document.createElement("article");article.className="founder-branch";
    const founderCard=document.createElement("div");founderCard.className="founder-card";founderCard.dataset.searchName=founder.displayName.toLowerCase();
    founderCard.appendChild(createPhoto(founder,"founder-photo"));
    const h2=document.createElement("h2");h2.textContent=founder.displayName;founderCard.appendChild(h2);
    const connector=document.createElement("div");connector.className="founder-connector";
    const grid=document.createElement("div");grid.className="founder-child-grid";
    fc.childIds.forEach(id=>{const p=peopleById.get(id);if(!p)return;const a=document.createElement("a");a.className="branch-child-card";a.href=`branch.html?id=${encodeURIComponent(p.id)}`;a.dataset.searchName=`${p.displayName} ${p.profileName||""}`.toLowerCase();a.appendChild(createPhoto(p,"branch-child-photo"));const s=document.createElement("strong");s.textContent=p.displayName;a.appendChild(s);const action=document.createElement("span");action.textContent="Explore branch →";a.appendChild(action);grid.appendChild(a);});
    article.append(founderCard,connector,grid);founderContainer.appendChild(article);
  });
}
function clearHighlights(){document.querySelectorAll(".branch-search-match").forEach(el=>el.classList.remove("branch-search-match"));}
function searchBranches(){const term=searchInput.value.trim().toLowerCase();clearHighlights();if(!term){searchMessage.textContent="Enter a name to search.";return;}const matches=[...document.querySelectorAll("[data-search-name]")].filter(el=>el.dataset.searchName.includes(term));if(!matches.length){searchMessage.textContent=`No branch was found for “${searchInput.value.trim()}.”`;return;}matches.forEach(el=>el.classList.add("branch-search-match"));matches[0].scrollIntoView({behavior:"smooth",block:"center"});searchMessage.textContent=`${matches.length} match${matches.length===1?"":"es"} found.`;}
function clearSearch(){searchInput.value="";searchMessage.textContent="";clearHighlights();}
searchButton.addEventListener("click",searchBranches);clearButton.addEventListener("click",clearSearch);searchInput.addEventListener("keydown",e=>{if(e.key==="Enter")searchBranches();});loadFamilyData();
