// journeys.mjs — arranges the Clavia screens into user-journey rows in a copied Section (see runtime `journeyRow`).
//   node ds/files/clients/journeys.mjs            (writes $TMPDIR/journey_<n>.json; run each with scripts/swap.mjs)
import fs from "node:fs";
const T = process.env.TMPDIR || "/tmp";
const S = (ref, name) => ({ ref, name });
const TODO = (todo, prompt) => ({ todo, prompt });
export const journeys = [
  { title: "Triage the contracts queue", desc: "Land on the contracts queue, switch tabs, search, open a request from a row or from its row menu.", items: [
    S("15068:12125", "38 · Contracts list"), S("15072:12193", "48 · Row menu"), S("15071:11532", "40 · Requests list"),
    TODO("Search and filter the queue", "Contracts list with the search field open and a typed query, plus the empty \"no match\" state. Same table, tabs and header as screen 38."),
    S("15073:14519", "01 · Request open (default)")] },
  { title: "Review a redline against the playbook", desc: "Open REQ-149, see the playbook findings by risk, filter and search the clause list, open a clause in each position.", items: [
    S("15073:14519", "01 · Default"), S("15057:7993", "02 · Filter menu open"), S("15057:12132", "03 · Filtered"), S("15057:12294", "04 · Search, no match"),
    S("15058:8130", "05 · Clause open, Unacceptable"), S("15061:9229", "16 · Clause open, Fallback"), S("15061:9528", "17 · Clause open, Preferred"), S("15061:9764", "18 · Clause open, Not in playbook")] },
  { title: "Act on a clause", desc: "Pick a position, apply the suggested wording as a tracked change or with a comment, or let AI rewrite it.", items: [
    S("15059:8130", "06 · Position picker open"),
    TODO("Pick a position from the playbook provisions", "Show the playbook's provisions for this clause and let the user choose which position to adopt (Figma comment #3). Panel open on the clause, provision list with the positions."),
    S("15059:8440", "07 · Apply options open"), S("15059:8733", "08 · Edit with AI, prompt"), S("15060:11619", "09 · Edit with AI, rewriting"), S("15060:11898", "10 · Wording updated"),
    S("15060:12186", "11 · Apply with comment"), S("15060:13938", "12 · Applied as tracked change"),
    TODO("Undo an applied change from the widget", "The applied suggestion in the panel with an Undo action inside the widget, since it is embedded in the Word document (Figma comment #4).")] },
  { title: "Run a different playbook", desc: "Choose another playbook, watch the review run, and see how the clause list changes (missing clauses, status).", items: [
    S("15062:9534", "19 · Run a playbook"), S("15062:9901", "20 · Search, no match"), S("15062:10171", "21 · Reviewing, progress"),
    TODO("Running state with loader", "Run a playbook while the review is in progress, with the running loader state from the previous design (Figma comment #1)."),
    S("15063:9853", "22 · Different playbook, missing clauses"), S("15063:10073", "23 · Status menu open"), S("15063:10322", "24 · Re-run complete")] },
  { title: "Ask Clavia", desc: "Ask about the contract, about a selection, flag the issues, ask how hard to push, then act on the suggestions.", items: [
    S("15066:10081", "25 · Ask, empty"),
    TODO("Selection: Ask or Redraft", "Text selected in the document with the small menu offering Ask or Redraft (screen 26 is missing from the file)."),
    S("15066:10493", "27 · About selected text"), S("15066:10602", "28 · Answer with citation"), S("15066:10722", "29 · Flag the issues, reading"), S("15067:10459", "30 · How hard should I push?"),
    S("15067:10606", "31 · Suggestions"), S("15067:10803", "32 · Reasoning and position picker"), S("15067:11060", "33 · Some applied, one dismissed"), S("15067:11283", "34 · Apply all"), S("15068:11647", "35 · Redraft result")] },
  { title: "Comment on a change", desc: "Add a comment to a change, see the margin note saved, edit it.", items: [
    S("15060:14225", "13 · Add comment"), S("15060:15410", "14 · Margin note saved"), S("15060:15736", "15 · Edit margin note"),
    TODO("Resolve or delete a margin note", "Margin note menu with Resolve and Delete, then the clause row after the note is gone.")] },
  { title: "Create a new contract", desc: "Start a new contract request, describe it, attach files, and submit.", items: [
    S("15072:12040", "45 · New contract"), S("15072:12086", "46 · Working"), S("15072:12139", "47 · Attach"),
    TODO("Contract request submitted", "Confirmation after submitting a new contract: the new request opens in the queue with status New and a toast.")] },
  { title: "Manage playbooks", desc: "Browse playbooks, filter by status, create a new one, open a draft, archive one.", items: [
    S("15071:11888", "41 · Playbooks list"),
    TODO("New playbook", "New Playbook flow from the Playbooks list: name, contract type, starting clauses."),
    TODO("Playbook detail", "A playbook open: its clauses with positions (starting, fallback, unacceptable), version and owner."),
    TODO("Archive a playbook", "Row menu on the Playbooks list with Archive, then the confirmation and the Archived tab.")] },
  { title: "Work with the vault", desc: "See the document sources, upload files, connect iManage, SharePoint, Box or Google Drive.", items: [
    S("15071:12126", "42 · Vault list"),
    TODO("Upload to the vault", "Upload flow from New Vault: drop zone, files listed, upload progress."),
    TODO("Connect a source", "Connect iManage, SharePoint, Box or Google Drive: source picker, sign-in step, connected state."),
    TODO("Vault detail", "A vault open: its files, owner, last updated, with search.")] },
  { title: "Use contract templates", desc: "Browse templates by type, create a new one, open a published template, use it for a new contract.", items: [
    S("15071:12342", "43 · Templates list"),
    TODO("New template", "New Template flow from the Templates list: name, type, starting document."),
    TODO("Template detail", "A template open: preview, version, usage count, Use for new contract."),
  ] },
  { title: "Organise work in projects", desc: "See active, on-hold and closed projects, open one to see its contracts.", items: [
    S("15071:12647", "44 · Projects list"),
    TODO("New project", "New Project flow from the Projects list: name, type, lead, add contracts."),
    TODO("Project detail", "A project open: its contracts and documents, status, lead, and progress.")] },
  { title: "Start a chat and navigate", desc: "Begin from Home with a question, use the history rail, collapse the navigation.", items: [
    TODO("Home: New chat", "Home screen with \"How can I help you today?\", the prompt box and the nav rail (screen 39 is missing from the file)."),
    S("15068:11891", "36 · Rail, History expanded"),
    TODO("Rail collapsed", "App shell with the navigation rail collapsed to icons (screen 37 is missing from the file)."),
    TODO("Chat answer", "A chat reply on Home with a cited answer and follow-up suggestions.")] },
];
if (process.argv[1] && process.argv[1].endsWith("journeys.mjs")) {
  journeys.forEach((j, n) => { const eyebrow = `Journey ${n + 1} of ${journeys.length}`; const spec = { journeyRow: { section: n === 0 ? { create: { name: "Clavia · User journeys", fromId: "15041:10639" } } : { id: "__SECTION__" }, row: { index: n, eyebrow, title: j.title, desc: j.desc, items: j.items } }, swaps: [] };
    fs.writeFileSync(`${T}/journey_${n}.json`, JSON.stringify(spec)); });
  console.log(journeys.length, "journey specs written;", journeys.reduce((a, j) => a + j.items.filter(x => x.todo).length, 0), "placeholders");
}
