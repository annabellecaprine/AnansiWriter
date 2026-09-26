const text = " Arthur Arthur "
const safeT = "Arthur"
const regex = new RegExp(`(?:^|\\W)(${safeT})(?=$|\\W)`, 'gi')
const matches = text.match(regex)
console.log("Matches:", matches)
