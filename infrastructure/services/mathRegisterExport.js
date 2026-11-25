// Importació per capçalera del registre acumulat; preserva salts de línia i cometes CSV.
function parseCsvRows(text) {
  const rows=[]; let row=[], value="", quoted=false;
  text=String(text).replace(/^\uFEFF/,"");
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted && text[i+1]==='"'){value+='"';i++;}
      else if(quoted || value.length===0) quoted=!quoted;
      else value+=ch;
    }else if(!quoted && ch===','){row.push(value);value="";}
    else if(!quoted && (ch==='\n'||ch==='\r')){
      if(ch==='\r'&&text[i+1]==='\n')i++;
      row.push(value);rows.push(row);row=[];value="";
    }else value+=ch;
  }
  if(quoted)throw new Error("El CSV conté un camp amb cometes sense tancar.");
  if(value.length||row.length){row.push(value);rows.push(row);}
  return rows;
}

function parseMathExportRows(rows) {
  const norm=v=>String(v??"").trim().normalize("NFC");
  const idx=rows.findIndex(row=>row.some(v=>norm(v)==="Paquet IA · normes i evidències")||row.some(v=>norm(v)==="Esborrany orientatiu · famílies"));
  if(idx<0)return null;
  const headers=rows[idx].map(norm);
  const at=(row,key)=>norm(row[headers.indexOf(key)]);
  const required=["Núm.","Alumne/a","Estat","Versió Tram 1","Text complet","Detall Tram 2 · criteris","Esborrany orientatiu · famílies","Paquet IA · normes i evidències"];
  for(const h of required)if(!headers.includes(h))throw new Error("Falta la columna del registre actualitzat: "+h);
  const result=[];
  for(const row of rows.slice(idx+1)){
    const rawName=at(row,"Alumne/a");
    if(!rawName)continue;
    const num=Number(at(row,"Núm."));
    if(!Number.isInteger(num)||num<=0)throw new Error("Número d'alumne/a invàlid al registre.");
    const parts=rawName.split(",").map(v=>v.trim());
    const name=parts.length===2?`${parts[1]} ${parts[0]}`:rawName;
    const status=at(row,"Estat"), version=at(row,"Versió Tram 1");
    if(status==="REVISAR DADES")throw new Error("Hi ha dades pendents de revisar al registre (fila d'alumne/a "+num+"). Corregeix-les abans d'importar.");
    const draft=at(row,"Esborrany orientatiu · famílies");
    const technical=at(row,"Text complet"),detail=at(row,"Detall Tram 2 · criteris"),packet=at(row,"Paquet IA · normes i evidències");
    // The versioned application owns the instructions; import only the actual student evidence, never the model example.
    const marker="EVIDÈNCIES DE L’ALUMNE/A:";
    const markerIndex=packet.indexOf(marker);
    const endMarker="ESBORRANY ORIENTATIU (revisa’l amb les evidències, no el copiïs mecànicament):";
    const data=markerIndex>=0?packet.slice(markerIndex+marker.length).split(endMarker)[0].trim():"";
    if(packet&&markerIndex<0)throw new Error("No s'ha pogut identificar el bloc d'evidències del paquet IA (fila "+num+").");
    const evidence=data||[technical,detail].filter(Boolean).join("\n\n");
    if(!evidence&&!draft)continue;
    if(!evidence)throw new Error("Hi ha un esborrany sense evidències (fila "+num+").");
    result.push({num,name,rawName,levels:{},tags:[],mathRegister:{schema:"math-register-v1",status,version,evidence,draft}});
  }
  return result;
}

export { parseCsvRows, parseMathExportRows };
