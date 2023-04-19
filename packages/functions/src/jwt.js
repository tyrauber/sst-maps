var crypto = require('crypto');
var signingMethod = 'sha256';
var signingType = 'hmac';

function b2a(a) {
    var c, d, e, f, g, h, i, j, o, b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", k = 0, l = 0, m = "", n = [];
    if (!a) return a;
    do c = a.charCodeAt(k++), d = a.charCodeAt(k++), e = a.charCodeAt(k++), j = c << 16 | d << 8 | e, 
    f = 63 & j >> 18, g = 63 & j >> 12, h = 63 & j >> 6, i = 63 & j, n[l++] = b.charAt(f) + b.charAt(g) + b.charAt(h) + b.charAt(i); while (k < a.length);
    return m = n.join(""), o = a.length % 3, (o ? m.slice(0, o - 3) :m) + "===".slice(o || 3);
}
  
function a2b(a) {
    var b, c, d, e = {}, f = 0, g = 0, h = "", i = String.fromCharCode, j = a.length;
    for (b = 0; 64 > b; b++) e["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(b)] = b;
    for (c = 0; j > c; c++) for (b = e[a.charAt(c)], f = (f << 6) + b, g += 6; g >= 8; ) ((d = 255 & f >>> (g -= 8)) || j - 2 > c) && (h += i(d));
    return h;
}

//Response when JWT is not valid.
var response401 = {
    statusCode: 401,
    statusDescription: 'Unauthorized'
};

function jwt_encode(payload, key, header) {
    //payload = Object.assign({ iat: Math.floor(Date.now() / 1000), iss: JWT_ISSUER, aud: JWT_AUDIENCE}, payload || {})
   
    // Convert payload to JSON
    var payloadJSON = JSON.stringify(payload);

    // base64url encode header and payload
    var headerSeg = b2a(JSON.stringify(header));
    var payloadSeg = b2a(payloadJSON);

    // Generate signature
    var signingInput = [headerSeg, payloadSeg].join('.');
    var signature = _sign(signingInput, key, signingMethod);

    // base64url encode signature
    var signatureSeg = b2a(signature);
    // Concatenate header, payload, and signature segments to form JWT
    var jwtToken = [headerSeg, payloadSeg, signatureSeg].join('.');

    return jwtToken;
};


function jwt_decode(token, key, noVerify, algorithm) {
    // check token
    if (!token) {
        throw new Error('No token supplied');
    }
    // check segments
    var segments = token.split('.');
    if (segments.length !== 3) {
        throw new Error('Not enough or too many segments');
    }

    // All segment should be base64
    var headerSeg = segments[0];
    var payloadSeg = segments[1];   
    var signatureSeg = segments[2];

    // base64 decode and parse JSON
    var header = JSON.parse(a2b(headerSeg));
    var payload = JSON.parse(a2b(payloadSeg));

    if (!noVerify) {
        // Verify signature. `sign` will return base64 string.
        var signingInput = [headerSeg, payloadSeg].join('.');

        if (!_verify(signingInput, key, signingMethod, signingType, signatureSeg)) {
            throw new Error('Signature verification failed');
        }

        // Support for nbf and exp claims.
        // According to the RFC, they should be in seconds.
        if (payload.nbf && Date.now() < payload.nbf*1000) {
            throw new Error('Token not yet active');
        }

        if (payload.exp && Date.now() > payload.exp*1000) {
            throw new Error('Token expired');
        }
    }

    return payload;
};

//Function to ensure a constant time comparison to prevent
//timing side channels.
function _constantTimeEquals(a, b) {
    if (a.length != b.length) {
        return false;
    }
    
    var xor = 0;
    for (var i = 0; i < a.length; i++) {
    xor |= (a.charCodeAt(i) ^ b.charCodeAt(i));
    }
    
    return 0 === xor;
}

function _verify(input, key, method, type, signature) {
    if(type === "hmac") {
        return _constantTimeEquals(signature, _sign(input, key, method));
    }
    else {
        throw new Error('Algorithm type not recognized');
    }
}


function _sign(input, key, method) {
    return crypto.createHmac(method, key).update(input).digest('base64url');
}

function extractToken(request) {
    var cookies = request.cookies || [];
    var queryParameters = request.querystring || {};

    // Extract Bearer token from Authorization header
    var authHeader = request.headers.authorization && request.headers.authorization.value || '';
    var bearerToken = authHeader.replace(/Bearer\s+/i, '');

    var cookieToken;
  
    for (var domain in cookies) {
        if (cookies[domain] && cookies[domain].name === JWT_SESSION_ID) {
            cookieToken = cookies[domain].value;
            break;
        }
    }

    // Extract token from query parameters
    var tokenQueryParam = (queryParameters.token && queryParameters.token.value || queryParameters.api_key && queryParameters.api_key.value || null);

    // Determine the order of precedence for token extraction
    return bearerToken || cookieToken || tokenQueryParam || null;
};

function handler(event) {
    var request = event.request;
    var response = event.response;
    var host = event.context.distributionDomainName;
    var payload = Object.assign({
        role: 'guest',
        iat: Math.floor(Date.now() / 1000),
        exp: 3600,
        iss: host, 
        aud: host
    },
        ...(JWT_PAYLOAD || {})
    )
    if (response){
        if(response.statusDescription === "OK"){
            var token = jwt_encode(payload, 
            JWT_SECRET_KEY, 
            { 
                alg: signingMethod, 
                typ: "JWT" 
            });
            response['cookies'] = response['cookies'] || {};
            response['cookies'][JWT_SESSION_ID] = {
                "value" : token,
                "attributes": `Path=/; Domain=${host}; Expires=${(payload.exp || 3600)}`
            }
            response.headers['authorization'] = {value: `BEARER ${token}`};
        }
        return response;
    } else if (request && request.headers.referer && request.headers.referer.value.match(host)){
        return request 
    } else if (request) {
        var jwtToken = extractToken(request);
        if(!jwtToken){
            return response401;
        } else {
            try{ 
                jwt_decode(jwtToken, JWT_SECRET_KEY, signingMethod);
            } catch(e) {
                console.log(e);
                return response401;
            }
            delete request.querystring.jwt;
            console.log("Valid JWT token")
            return request;
        }
    }
}
