import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvRows, parseMathExportRows } from '../infrastructure/services/mathRegisterExport.js';
const keys=["Núm.","Alumne/a","Estat","Versió Tram 1","Text complet","Detall Tram 2 · criteris","Esborrany orientatiu · famílies","Paquet IA · normes i evidències"];
const row=["1","Prova, Alumne","Provisional","A","Calcula.","Detecta errors.","En el càlcul, \"prova\".","NORMES I MODEL NO IMPORTAR\nEVIDÈNCIES DE L’ALUMNE/A:\nCalcula.\n\nTRAM 2 · DETALL DELS CRITERIS:\nDetecta errors.\n\nESBORRANY ORIENTATIU (revisa’l amb les evidències, no el copiïs mecànicament):\nMODEL"];
test('CSV amb salts de línia, comes, cometes i BOM',()=>{
 const csv=[keys,row,["2","","","","","","",""]].map(r=>r.map(v=>'"'+v.replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const items=parseMathExportRows(parseCsvRows('\uFEFF'+csv));
 assert.equal(items.length,1);assert.equal(items[0].name,'Alumne Prova');assert.equal(items[0].mathRegister.draft,row[6]);assert.match(items[0].mathRegister.evidence,/Detecta errors/);assert.doesNotMatch(items[0].mathRegister.evidence,/MODEL/);assert.deepEqual(items[0].tags,[]);
});
test('ordre de columnes i format antic',()=>{const ix=keys.map((_,i)=>keys.length-1-i);assert.equal(parseMathExportRows([ix.map(i=>keys[i]),ix.map(i=>row[i])])[0].num,1);assert.equal(parseMathExportRows([['A','B']]),null);});
test('rebutja dades invàlides i esborrany sense evidència',()=>{assert.throws(()=>parseMathExportRows([keys,['1','Prova, Alumne','REVISAR DADES','A','','','','']]));assert.throws(()=>parseMathExportRows([keys,['1','Prova, Alumne','Provisional','A','','','esborrany','']]));assert.throws(()=>parseMathExportRows([keys.slice(0,-1),row]));});
