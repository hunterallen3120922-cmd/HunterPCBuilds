/**
 * Turns text copied from an eBay feedback page (Feedback profile → Received as seller, select all, copy) into reviews.
 * eBay's page text runs: comment, item title (#item number), buyer (score), price, "Verified purchase", when.
 * The page shows the rating as an icon only, so every pasted review comes in as positive; change any that aren't.
 * Buyer names are stored masked ("prync-20" → "p***0"), the way eBay itself shows them to the public.
 */
export interface PastedReview {
  comment: string;
  buyer: string | null;
  item: string | null;
  item_number: string | null;
  price: number | null;
  reviewed_on: string;
  /** Our guess at whether it belongs on the site: a computer sale that doesn't read as a complaint. */
  showGuess: boolean;
}
export interface PastedPage {
  reviews: PastedReview[];
  positivePct: number | null;
  feedbackCount: number | null;
  username: string | null;
}

const WHEN = /^(past month|past 6 months|past year|past 12 months|more than a year ago)$/i;
// "n***f", "n***f (37)" or a full name with its score, "prync-20 (21)"
const BUYER = /^(?:([^\s()]\*{3}[^\s()])(?:\s*\(\s*[\d,]+\s*\)?)?|([^\s()]{2,64})\s*\(\s*[\d,]+\s*\)?)$/;
const PRICE = /^(?:US\s*)?\$\s*([\d,]+(?:\.\d{2})?)$/i;
const NOISE = /^(verified purchase|reply|report|report this buyer|item photo\(s\) from verified buyer|view details|feedback|from|when|see more|show more|\))$/i;
const COMPUTER = /\b(pc|computer|desktop|gaming|laptop|tower|itx|gpu|graphics card|geforce|gtx|rtx|radeon|cpu|core[- ]?i\d|ryzen|motherboard|ram|ddr\d|ssd|nvme|hdd|power supply|psu)\b/i;
const COMPLAINT = /\b(not as described|dishonest|rude|loose|problems?|broken|doesn'?t work|didn'?t work|refund(ed)?|damaged|missing|disappoint\w*|slow shipping|12 years old|7\/8)\b/i;

/** "prync-20" → "p***0"; already-masked names stay as they are. */
const mask = (name: string) => (name.includes("***") || name.length < 3 ? name : `${name[0]}***${name[name.length - 1]}`);
const decode = (t: string) => t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
/** Column headers above the first review; anything before them is page chrome. */
const HEADER = /^(feedback\s+from\s+when|when)$/i;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** eBay only says "Past month" etc., so use the start of that window's newer half as a best guess. */
function whenToDate(when: string, now: Date): string {
  const d = new Date(now);
  const w = when.toLowerCase();
  if (w.includes("6 months")) d.setMonth(d.getMonth() - 1);
  else if (w.includes("year") && !w.includes("more")) d.setMonth(d.getMonth() - 6);
  else if (w.includes("more")) d.setFullYear(d.getFullYear() - 1);
  return iso(d);
}

export function parseEbayFeedback(text: string, now = new Date()): PastedPage {
  // Put split bits back together: "(#" + "123)" and "n***f" + "(37" + ")"
  let lines = decode(text).replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const joined: string[] = [];
  for (const l of lines) {
    const prev = joined[joined.length - 1];
    if (prev && /\(#\s*$/.test(prev) && /^\d+\)?$/.test(l)) joined[joined.length - 1] = `${prev}${l.replace(/\)?$/, ")")}`;
    else if (prev && /^\)$/.test(l)) joined[joined.length - 1] = `${prev})`;
    else joined.push(l);
  }
  lines = joined;

  const full = lines.join("\n");
  const pct = full.match(/positive feedback[^:\n]*:\s*([\d.]+)\s*%/i) ?? full.match(/([\d.]+)%\s*positive feedback/i);
  const count = full.match(/([\d,]+)\s+feedback received/i);
  // Your name: either "name (score)" at the top, or the line just above "Positive Feedback"
  const pctAt = lines.findIndex((l) => /positive feedback/i.test(l));
  const above = pctAt > 0 ? lines[pctAt - 1].match(/^([A-Za-z0-9._-]{3,64})(\s*\(\s*[\d,]+\s*\)?)?$/) : null;
  const user = above ?? full.match(/^([A-Za-z0-9._-]{3,64})\s*\(\s*[\d,]+/m);

  // Start after the column headers if they're there
  let start = 0;
  for (let i = 0; i < lines.length; i++) if (HEADER.test(lines[i])) start = i + 1;
  if (pctAt >= 0 && /\(last 12 months\)\s*:/i.test(lines[pctAt])) start = Math.max(start, pctAt + 1);

  const reviews: PastedReview[] = [];
  let block: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (!WHEN.test(l)) { block.push(l); continue; }
    const r = toReview(block, l, now);
    if (r) reviews.push(r);
    block = [];
  }
  return {
    reviews,
    positivePct: pct ? Number(pct[1]) : null,
    feedbackCount: count ? Number(count[1].replace(/,/g, "")) : null,
    username: user && !/\*/.test(user[1]) ? user[1] : null,
  };
}

function toReview(block: string[], when: string, now: Date): PastedReview | null {
  const buyerAt = block.findIndex((l) => BUYER.test(l));
  if (buyerAt < 0) return null;
  const bm = block[buyerAt].match(BUYER)!;
  const buyer = mask(bm[1] ?? bm[2]);
  // Skip the "Reply" etc. left over from the review above, and the "name (score) / Positive Feedback" page header
  const before = block.slice(0, buyerAt).filter((l) => !NOISE.test(l) && !/positive feedback|^\d[\d,]* feedback/i.test(l));
  const after = block.slice(buyerAt + 1);
  const itemAt = before.findIndex((l) => /\(#\s*\d+\)?\s*$/.test(l));
  let item: string | null = null;
  let itemNumber: string | null = null;
  let commentLines = before;
  if (itemAt >= 0) {
    const m = before[itemAt].match(/^(.*?)\s*\(#\s*(\d+)\)?\s*$/)!;
    item = m[1] || null;
    itemNumber = m[2];
    commentLines = before.slice(0, itemAt);
  } else if (before.length > 1) {
    // Some layouts put the item title after the comment without an item number
    item = before[before.length - 1];
    commentLines = before.slice(0, -1);
  }
  const comment = commentLines.join(" ").replace(/^\*+\s*/, "").trim();
  if (!comment) return null;
  const priceLine = after.find((l) => PRICE.test(l)) ?? block.find((l) => PRICE.test(l));
  const price = priceLine ? Number(priceLine.match(PRICE)![1].replace(/,/g, "")) : null;
  return { comment: comment.slice(0, 1000), buyer, item: item?.slice(0, 200) ?? null, item_number: itemNumber, price, reviewed_on: whenToDate(when, now),
    showGuess: COMPUTER.test(item ?? "") && !COMPLAINT.test(comment) };
}
