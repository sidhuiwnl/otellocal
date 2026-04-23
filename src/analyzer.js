/**
 * analyser.js — detects anomalously slow spans
 *
 * Keeps a rolling window of duration samples per span name.
 * When a new span comes in, compares it against the historical
 * p95 for that operation name.
 *
 * Why p95 and not average?
 *   Average is skewed by outliers. p95 means "95% of the time
 *   this span finishes under X ms" — much more meaningful.
 */


const WINDOW_SIZE  = 100   // keep last 100 samples per span name
const SLOW_FACTOR  = 2.0   // flag if duration > 2x the p95
const MIN_SAMPLES  = 5     // don't flag until we have enough history


const history = new Map();

//Example

// Map {
//   "GET /api/user" => [120, 110, 130],
//   "db.query"      => [45, 50, 47],
//   "auth.validate" => [10, 12, 9]
// }

export function recordSample(spanName,durationMs){
    if(!history.has(spanName)) history.set(spanName,[])
    
    const samples = history.get(spanName)
    samples.push(durationMs)

     // Keep only the last WINDOW_SIZE samples

    if (samples.length > WINDOW_SIZE) samples.shift()
}

export function ananlyzeSpan(spanName,durationMs){
    const samples = history.get(spanName) ?? [];

    if(samples.length < WINDOW_SIZE){
        return {
            isSlow : false,
            p95 : null,
            avgMs : null,
            ratio : null,
            sampleCount : samples.length
        }
    }

    const p95 = calcP95(samples);
    const avgMs = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
    const ratio = durationMs / p95

    return {
        isSlow :  ratio > SLOW_FACTOR,
        p95:         Math.round(p95),
        avgMs,
        ratio:       Math.round(ratio * 10) / 10,
        sampleCount: samples.length,

    }
}


export function getAllStats(){
    const out = {}
    for(const [name,samples] of history){
        if(samples.length < 2) continue

        out[name] = {
            p95:    Math.round(calcP95(samples)),
            avg:    Math.round(samples.reduce((a, b) => a + b, 0) / samples.length),
            min:    Math.round(Math.min(...samples)),
            max:    Math.round(Math.max(...samples)),
            count:  samples.length,
        }
    }
    return out
}


export function resetAnalyzer(samples){
    history.clear()
}

// Example

// samples = [120, 110, 130, 125, 140, 150, 300]
// sorted = [110, 120, 125, 130, 140, 150, 300]
// idx = Math.floor(7 * 0.95)
//     = Math.floor(6.65)
//     = 6
// sorted[6] = 300    


function calcP95(samples){
    const sorted = [...samples].sort((a,b) => b - a);
    idx = Math.floor(sorted.length * 0.95);

    return sorted[Math.min(idx,sorted.length - 1)];


}