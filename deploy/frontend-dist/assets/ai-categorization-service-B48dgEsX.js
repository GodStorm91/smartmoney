import{l as s,H as o}from"./index-ZT26ts1x.js";/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n=[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]],c=s("arrow-down",n);/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]],g=s("arrow-up",i);async function u(a=50,t="ja"){return(await o.post("/api/ai/categorize/suggestions",{limit:a,language:t})).data}async function d(a,t=50,e="ja"){return(await o.post("/api/ai/categorize/budget-suggestions",{month:a,limit:t,language:e})).data}async function w(a){return(await o.post("/api/ai/categorize/apply",a)).data}export{g as A,w as a,c as b,u as c,d as g};
