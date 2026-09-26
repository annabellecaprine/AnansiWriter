const searchTerms = ["Arthur"]
const text = "<p>Arthur went to the store.</p>"
let matches = 0

searchTerms.forEach(term => {
    const safeT = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(?<=^|\\W)(${safeT})(?=$|\\W)`, 'gi')
    const regMatch = text.match(regex)
    if (regMatch) {
        console.log(`Matched '${term}':`, regMatch)
        matches += regMatch.length
    }
})
console.log("Total matched count:", matches)
