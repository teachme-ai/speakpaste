import { type } from 'arktype';
const schema = type({ _v: '2' });
const res1 = schema({ _v: 2 });
console.log("number 2:", res1.errors ? res1.errors.summary : "valid");
const res2 = schema({ _v: "2" });
console.log("string 2:", res2.errors ? res2.errors.summary : "valid");
