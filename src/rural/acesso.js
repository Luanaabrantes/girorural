// Fundacao interna: nao registra endpoints, cadastro, busca ou motor de reservas.
class ErroAcessoRural extends Error {
    constructor(status, mensagem) { super(mensagem); this.status = status; }
}
function idValido(valor) {
    if (!/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor))) {
        throw new ErroAcessoRural(400, 'Identificador inválido.');
    }
    return Number(valor);
}
function identidade(usuario) {
    // Receber exclusivamente req.usuario, preenchido pelo middlewareAuth.
    if (!usuario || !Number.isSafeInteger(usuario.id) || usuario.id <= 0) {
        throw new ErroAcessoRural(401, 'Sessão autenticada necessária.');
    }
    return usuario.id;
}
function encontrado(rows) {
    // Mesmo status e mensagem para ID ausente e recurso privado de terceiros.
    if (!rows.length) throw new ErroAcessoRural(404, 'Recurso não encontrado.');
    return rows[0];
}
function campoUnico(body, campo) {
    if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).length !== 1 || !Object.hasOwn(body, campo)
        || (body[campo] !== null && (typeof body[campo] !== 'string' || body[campo].length > 5000))) {
        throw new ErroAcessoRural(400, `Informe somente ${campo}, texto de até 5000 caracteres ou null.`);
    }
    return body[campo];
}
function criarAcessoRural(db) {
    const equipamentoSQL = `SELECT id, proprietario_id, nome, categoria, descricao, estado,
        criado_em, atualizado_em FROM equipamentos WHERE id = ? AND proprietario_id = ?`;
    const anuncioSQL = `SELECT a.id, a.equipamento_id, a.diaria, a.cidade, a.uf, a.condicoes,
        a.estado, a.criado_em, a.atualizado_em FROM anuncios a
        JOIN equipamentos e ON e.id = a.equipamento_id
        WHERE a.id = ? AND e.proprietario_id = ?`;
    async function consultaPrivada(usuario, id, sql) {
        const usuarioId = identidade(usuario);
        const [rows] = await db.execute(sql, [idValido(id), usuarioId]);
        return encontrado(rows);
    }
    async function alterarComoProprietario(usuario, id, body, campo, tipo) {
        const usuarioId = identidade(usuario);
        const recursoId = idValido(id);
        const valor = campoUnico(body, campo);
        // Lock e escrita no mesmo recurso/transacao: evita autorizar com base
        // em uma leitura antiga se a propriedade mudar em uma entrega futura.
        const c = await db.getConnection();
        try {
            await c.beginTransaction();
            const sql = tipo === 'equipamento' ? equipamentoSQL : anuncioSQL;
            const [rows] = await c.execute(`${sql} FOR UPDATE`, [recursoId, usuarioId]);
            encontrado(rows);
            if (tipo === 'equipamento') {
                await c.execute('UPDATE equipamentos SET descricao = ? WHERE id = ? AND proprietario_id = ?',
                    [valor, recursoId, usuarioId]);
            } else {
                await c.execute(`UPDATE anuncios a JOIN equipamentos e ON e.id = a.equipamento_id
                    SET a.condicoes = ? WHERE a.id = ? AND e.proprietario_id = ?`,
                [valor, recursoId, usuarioId]);
            }
            await c.commit();
        } catch (e) {
            try { await c.rollback(); } catch { /* preservar erro original */ }
            throw e;
        } finally { c.release(); }
    }
    return {
        consultarEquipamentoPrivado(usuario, id) { return consultaPrivada(usuario, id, equipamentoSQL); },
        consultarAnuncioPrivado(usuario, id) { return consultaPrivada(usuario, id, anuncioSQL); },
        async consultarReservaPrivada(usuario, id) {
            const usuarioId = identidade(usuario);
            const [rows] = await db.execute(`SELECT r.id, r.anuncio_id, r.solicitante_id,
                r.inicio, r.fim, r.estado, r.criado_em, r.atualizado_em,
                e.proprietario_id FROM reservas r JOIN anuncios a ON a.id = r.anuncio_id
                JOIN equipamentos e ON e.id = a.equipamento_id
                WHERE r.id = ? AND (r.solicitante_id = ? OR e.proprietario_id = ?)`,
            [idValido(id), usuarioId, usuarioId]);
            const reserva = encontrado(rows);
            return { ...reserva, como_proprietario: reserva.proprietario_id === usuarioId,
                como_solicitante: reserva.solicitante_id === usuarioId };
        },
        async consultarAnuncioPublico(id) {
            const [rows] = await db.execute(`SELECT a.id, e.nome, e.categoria, e.descricao,
                a.diaria, a.cidade, a.uf, a.condicoes FROM anuncios a
                JOIN equipamentos e ON e.id = a.equipamento_id
                WHERE a.id = ? AND a.estado = 'ativo' AND e.estado = 'ativo'`, [idValido(id)]);
            // Allowlist adicional evita que futuras colunas privadas de uma
            // consulta ampliada sejam devolvidas por acidente.
            const a = encontrado(rows);
            return Object.fromEntries(['id', 'nome', 'categoria', 'descricao', 'diaria', 'cidade', 'uf', 'condicoes']
                .map(k => [k, a[k]]));
        },
        alterarDescricaoEquipamento(usuario, id, body) {
            return alterarComoProprietario(usuario, id, body, 'descricao', 'equipamento');
        },
        alterarCondicoesAnuncio(usuario, id, body) {
            return alterarComoProprietario(usuario, id, body, 'condicoes', 'anuncio');
        }
    };
}
module.exports = { criarAcessoRural, ErroAcessoRural };
