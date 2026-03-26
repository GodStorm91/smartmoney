import{h as a,v as o}from"./index-3DIAFTS5.js";/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]],p=a("arrow-down",i);/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n=[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]],d=a("arrow-up",n);/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r=[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]],y=a("layout-grid",r);async function h(t=50,e="ja"){return(await o.post("/api/ai/categorize/suggestions",{limit:t,language:e})).data}async function u(t,e=50,s="ja"){return(await o.post("/api/ai/categorize/budget-suggestions",{month:t,limit:e,language:s})).data}async function w(t){return(await o.post("/api/ai/categorize/apply",t)).data}export{d as A,y as L,w as a,p as b,h as c,u as g};
