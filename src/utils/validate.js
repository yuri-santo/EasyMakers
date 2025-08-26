export function requireFields(obj, fields = []) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null) {
      const err = new Error(`Campo obrigatório ausente: ${f}`);
      err.status = 400;
      throw err;
    }
  }
}
