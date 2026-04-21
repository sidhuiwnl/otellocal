import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export function parseOtlpJson(raw){
    const body = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(raw.toString());
    return extractSpans(body);
    console.log("The body parser",body)
}


export function parseOtlpProto(buffer){
    try{
        const text = buffer.toString("utf-8");
        if(text.trimStart().startsWith('{')) return parseOtlpJson(text);
    }catch(_){}

    try{
        const transformer = require('@opentelemetry/otlp-transformer');
        if(transformer?.deserializeTraceRequest){
            return extractSpans(transformer.deserializeTraceRequest(buffer));
        }
    }catch(_){}
    
    throw new Error(
    'Could not decode protobuf. Set OTEL_EXPORTER_OTLP_PROTOCOL=http/json in your app.'
  );
}

export function extractSpans(request){
    const spans =   [];
    const resourceSpans = request.resourceSpans ?? request.resource_spans ?? [];

    for(const rs of resourceSpans ){
        const resource = rs.resource ?? {};
        const scopeSpans = rs.scopeSpans ?? rs.scope_spans ?? rs.instrumentationLibrarySpans ?? [];
        for(const ss of scopeSpans){
            for(const span of (ss.spans ?? [])){
               spans.push({
                    traceId:           toHex(span.traceId   ?? span.trace_id),
                    spanId:            toHex(span.spanId    ?? span.span_id),
                    parentSpanId:      toHex(span.parentSpanId ?? span.parent_span_id) || null,
                    name:              span.name,
                    kind:              span.kind ?? 0,
                    startTimeUnixNano: span.startTimeUnixNano ?? span.start_time_unix_nano ?? '0',
                    endTimeUnixNano:   span.endTimeUnixNano   ?? span.end_time_unix_nano   ?? '0',
                    attributes:        span.attributes ?? [],
                    status:            span.status ?? { code: 0 },
                    events:            span.events  ?? [],
                    resource,
              });
            }
        }
    }

    return spans;

}


function toHex(value){
    if (!value) return '';
    
    if(typeof value === 'string'){
        if(/^[0-9a-f]+$/i.test(value)) return value.toLowerCase();

        try{
            return Buffer.from(value, 'base64').toString('hex');
        }catch(_){

        }

        return value;
    }

    if(value instanceof Uint8Array || Buffer.isBuffer(value)){
        return Buffer.from(value).toString('hex');
    }
    return String(value);

    
}