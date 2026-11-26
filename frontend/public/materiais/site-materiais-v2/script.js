
/* dados e autentição sao conectados ao backend aqui */
const API = '/api';

const $ = (s) => document.querySelector(s);
const pagina = document.body.dataset.pagina;

const exemplo = (id, nome, status) => ({ id, nome, status, descricao: '', foto: '', autor: '' });
const inicial = () => ({
  contas: {},
  proximoId: 106,
  itens: [
    exemplo('0094', 'LÃ¡pis', 'Encontrado'),
    exemplo('0097', 'Borracha', 'Encontrado'),
    exemplo('0102', 'Caneta', 'Encontrado'),
    exemplo('0105', 'RÃ©gua', 'Procurando'),
    exemplo('0089', 'Apontador', 'Procurando'),
    exemplo('0095', 'MÃ³dulo 6 de Linguagens', 'Procurando'),
  ],
  mensagens: ['Demora na entrega do material', 'Perda do ID', 'Roubo do material por um aluno']
    .map((texto, i) => ({
      chave: 'ex' + i,
      tipo: 'reclamacao',
      texto,
      autor: '',
      status: 'Nova'
    })),
});

function ler() {
  try {
    return JSON.parse(localStorage.getItem('materiais')) || inicial();
  } catch {
    return inicial();
  }
}

// LÃª, altera e grava de uma vez, para nÃ£o sobrescrever mudanÃ§as de outra aba
function alterar(mudanca) {
  const dados = ler();
  mudanca(dados);

  try {
    localStorage.setItem('materiais', JSON.stringify(dados));
    return true;
  } catch {
    alert('NÃ£o foi possÃ­vel salvar. O armazenamento do navegador pode estar cheio ou bloqueado.');
    return false;
  }
}

const novaChave = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const gerarId = (d) => String(d.proximoId++).padStart(4, '0');

function el(tag, texto, classe) {
  const e = document.createElement(tag);

  if (texto) e.textContent = texto;
  if (classe) e.className = classe;

  return e;
}

function botao(texto, acao) {
  const b = el('button', texto, 'mini');
  b.type = 'button';
  b.addEventListener('click', acao);
  return b;
}

function imagem(src) {
  const i = el('img');
  i.src = src;
  i.alt = 'Foto do item';
  return i;
}

/* ---------- SessÃ£o e menu ---------- */

let usuario = null;

try {
  usuario = JSON.parse(sessionStorage.getItem('usuario'));
} catch {}

const inicio = {
  aluno: 'aluno-material.html',
  func: 'func-avisos.html'
};

const permitido = pagina === 'login' || (usuario && pagina.startsWith(usuario.tipo));

if (!permitido) {
  location.replace(usuario ? inicio[usuario.tipo] : 'index.html');
}

function montarMenu() {
  const links = usuario.tipo === 'aluno'
    ? [
        ['aluno-material.html', 'Material do aluno'],
        ['aluno-avisos.html', 'Avisos']
      ]
    : [
        ['func-avisos.html', 'Avisos'],
        ['func-material.html', 'Material do aluno']
      ];

  links.push(['index.html', 'Sair']);

  links.forEach(([href, texto]) => {
    const a = el('a', texto);
    a.href = href;

    if (texto === 'Sair') {
      a.addEventListener('click', () => {
        sessionStorage.removeItem('usuario');
        sessionStorage.removeItem('token');
      });
    }

    $('#menu').append(a);
  });

  $('.botao-menu').addEventListener('click', () => {
    $('#menu').hidden = !$('#menu').hidden;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#menu').hidden = true;
  });
}

/* ---------- Imagens ---------- */

let foto = '';

function mostrarFoto(src) {
  foto = src;

  const p = $('#previa');
  p.hidden = !src;

  if (src) {
    p.src = src;
  } else {
    p.removeAttribute('src');
  }

  if ($('#vazio')) {
    $('#vazio').hidden = !!src;
  }
}

function prepararImagem() {
  $('#escolher').addEventListener('click', () => $('#arquivo').click());

  $('#arquivo').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';

    if (!f) return;

    try {
      const bmp = await createImageBitmap(f);
      const escala = Math.min(1, 700 / Math.max(bmp.width, bmp.height));

      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bmp.width * escala));
      c.height = Math.max(1, Math.round(bmp.height * escala));

      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, 0, 0, c.width, c.height);

      mostrarFoto(c.toDataURL('image/jpeg', 0.75));
    } catch {
      alert('NÃ£o consegui abrir essa imagem. Tente JPG ou PNG.');
    }
  });
}

/* ---------- PÃ¡ginas ---------- */

const paginas = {

  /* ---------- LOGIN E CADASTRO COM API ---------- */

  login() {
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('token');

    const form = $('#form-login');
    let cadastro = false;

    $('#alternar').addEventListener('click', () => {
      cadastro = !cadastro;

      $('#extra').hidden = !cadastro;

      $('#titulo').textContent = cadastro ? 'CADASTRO' : 'LOGIN';
      $('#enviar').textContent = cadastro ? 'CADASTRAR' : 'LOGIN';

      $('#alternar').textContent = cadastro ? '[VOLTAR]' : '[SIGN UP]';

      $('#erro').textContent = '';

      const campoNome = form.elements.namedItem('nome');
      campoNome.required = cadastro;
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = form.elements.namedItem('usuario').value.trim().toLowerCase();
      const senha = form.elements.namedItem('senha').value;
      const nome = form.elements.namedItem('nome').value.trim();

      $('#erro').textContent = '';

      if (!email || !senha) {
        $('#erro').textContent = 'Preencha o email e a senha.';
        return;
      }

      if (cadastro && nome.length < 2) {
        $('#erro').textContent = 'Informe seu nome completo.';
        return;
      }

      const enviar = $('#enviar');
      enviar.disabled = true;

      try {
        let resposta;
        let dados;

        if (cadastro) {
          // Cria uma conta de aluno no backend.
          resposta = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: nome,
              email,
              password: senha
            })
          });

          dados = await resposta.json();

          if (!resposta.ok) {
            throw new Error(dados.error || dados.message || 'NÃ£o foi possÃ­vel criar a conta.');
          }
        }

        // Faz login, tanto para quem jÃ¡ tem conta quanto apÃ³s o cadastro.
        resposta = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            password: senha
          })
        });

        dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(dados.error || dados.message || 'Email ou senha incorretos.');
        }

        if (!dados.token || !dados.user) {
          throw new Error('O servidor nÃ£o retornou os dados de autenticaÃ§Ã£o esperados.');
        }

        // Guarda o token JWT e os dados do usuÃ¡rio na sessÃ£o.
        sessionStorage.setItem('token', dados.token);

        usuario = {
          id: dados.user.id,
          nome: dados.user.name,
          email: dados.user.email,
          tipo: dados.user.role
        };

        sessionStorage.setItem('usuario', JSON.stringify(usuario));

        // Direciona conforme o perfil retornado pela API.
        if (inicio[usuario.tipo]) {
          location.href = inicio[usuario.tipo];
        } else {
          sessionStorage.removeItem('usuario');
          sessionStorage.removeItem('token');
          throw new Error('Perfil de usuÃ¡rio desconhecido.');
        }

      } catch (erro) {
        $('#erro').textContent = erro.message || 'NÃ£o foi possÃ­vel conectar ao servidor.';
      } finally {
        enviar.disabled = false;
      }
    });
  },

  
'aluno-material'() {
  prepararImagem();

  $('#form-item').addEventListener('submit', async (e) => {
    e.preventDefault();

    const f = e.target;

    const nome = f.nome.value.trim();
    const descricao = f.descricao.value.trim();
    const categoria = f.categoria.value;
    const localizacao = f.localizacao.value.trim();
    const data = f.data.value;
    const tipo = f.tipo.value;

    if (!nome || !descricao || !categoria || !localizacao || !data || !tipo) {
      $('#retorno').textContent = 'Preencha todos os campos.';
      return;
    }

    const token = sessionStorage.getItem('token');

    if (!token) {
      $('#retorno').textContent = 'Sua sessÃ£o expirou. FaÃ§a login novamente.';
      location.href = 'index.html';
      return;
    }

    const enviar = f.querySelector('button[type="submit"], button:not([type])');
    enviar.disabled = true;
    $('#retorno').textContent = 'Enviando material...';

    try {
      const resposta = await fetch(`${API}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: nome,
          description: descricao,
          category: categoria,
          location: localizacao,
          occurrence_date: data,
          type: tipo,
          image: foto || null
        })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.error || 'NÃ£o foi possÃ­vel cadastrar o material.');
      }

      f.reset();
      mostrarFoto('');

      $('#retorno').textContent =
        `Material enviado com sucesso! Protocolo: ${dados.protocol}`;

    } catch (erro) {
      $('#retorno').textContent =
        erro.message || 'Erro ao conectar com o servidor.';
    } finally {
      enviar.disabled = false;
    }
  });
},



  
  'aluno-avisos'() {

    const form = $('#form-mensagem');
    const enviar = form.querySelector('button[type="submit"], button:not([type])');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const tipo = form.tipo.value;
      const texto = form.texto.value.trim();

      if (!texto) return;

      const token = sessionStorage.getItem('token');

      if (!token) {
        $('#retorno').textContent = 'Sua sessÃ£o expirou. FaÃ§a login novamente.';
        location.href = 'index.html';
        return;
      }

      enviar.disabled = true;
      $('#retorno').textContent = 'Enviando aviso...';

      try {
        const resposta = await fetch(`${API}/notices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: tipo === 'reclamacao' ? 'Reclama\u00E7\u00E3o' : 'Informa\u00E7\u00E3o',
            description: texto
          })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(dados.error || 'NÃ£o foi possÃ­vel enviar o aviso.');
        }

        form.reset();

        $('#retorno').textContent =
          `Aviso enviado com sucesso! Protocolo: ${dados.protocol}`;

        await desenhar();

      } catch (erro) {
        $('#retorno').textContent =
          erro.message || 'Erro ao conectar com o servidor.';
      } finally {
        enviar.disabled = false;
      }
    });

    async function desenhar() {
      const preencher = (id, lista) => {
        $(id).replaceChildren(
          ...(lista.length ? lista : ['Nada enviado ainda.'])
            .map((t) => el('li', t))
        );
      };

      const token = sessionStorage.getItem('token');

      try {
        const [resItens, resAvisos] = await Promise.all([
          fetch(`${API}/items`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API}/notices`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!resItens.ok || !resAvisos.ok) {
          throw new Error('NÃ£o foi possÃ­vel carregar seus registros.');
        }

        const dadosItens = await resItens.json();
        const dadosAvisos = await resAvisos.json();

        preencher(
          '#meus-itens',
          (dadosItens.items || []).map((i) =>
            `${i.title} (${i.protocol}) â€” ${i.status}`
          )
        );

        preencher(
          '#minhas-mensagens',
          (dadosAvisos.notices || []).map((m) =>
            `${m.title}: ${m.description} â€” ${m.status} (${m.protocol})`
          )
        );

      } catch (erro) {
        preencher('#meus-itens', [erro.message]);
        preencher('#minhas-mensagens', [erro.message]);
      }
    }

    desenhar();
  },




  'func-material'() {
    const lista = $('#pedido');
    const situacao = $('#situacao');
    const retorno = $('#retorno');
    const botaoAtualizar = $('#gerar-id');

    const token = sessionStorage.getItem('token');
    const statusValidos = ['Em análise', 'Procurando', 'Encontrado', 'Entregue'];

    let itens = [];

    situacao.replaceChildren(
      ...statusValidos.map(s => new Option(s, s))
    );

    $('#nome').readOnly = true;
    $('#descricao').readOnly = true;

    async function requisicao(caminho, opcoes = {}) {
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(opcoes.headers || {})
      };

      if (opcoes.body) headers['Content-Type'] = 'application/json';

      const resposta = await fetch(`${API}${caminho}`, {
        ...opcoes,
        headers
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(dados.error || dados.message || `Erro HTTP ${resposta.status}`);
      }

      return dados;
    }

    function selecionarItem() {
      const item = itens.find(i => String(i.id) === lista.value);

      if (!item) {
        $('#nome').value = '';
        $('#descricao').value = '';
        retorno.textContent = '';
        return;
      }

      $('#nome').value = item.title || '';
      $('#descricao').value = item.description || '';
      situacao.value = item.status;
      retorno.textContent = `Protocolo: ${item.protocol}`;
    }

    async function carregar(selecionado = '') {
      const dados = await requisicao('/items');
      itens = dados.items || [];

      lista.replaceChildren(
        new Option('Selecione um material', ''),
        ...itens.map(i => new Option(
          `${i.protocol} — ${i.title} (${i.status})`,
          String(i.id)
        ))
      );

      lista.value = selecionado;
      selecionarItem();
    }

    lista.addEventListener('change', selecionarItem);

    botaoAtualizar.addEventListener('click', async () => {
      const item = itens.find(i => String(i.id) === lista.value);

      if (!item) {
        retorno.textContent = 'Selecione um material primeiro.';
        return;
      }

      try {
        botaoAtualizar.disabled = true;
        retorno.textContent = 'Atualizando status...';

        await requisicao(`/items/${item.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: situacao.value })
        });

        await carregar(String(item.id));
        retorno.textContent = `Status atualizado: ${situacao.value}`;
      } catch (erro) {
        retorno.textContent = erro.message;
      } finally {
        botaoAtualizar.disabled = false;
      }
    });

    carregar().catch(erro => {
      retorno.textContent = `Erro ao carregar materiais: ${erro.message}`;
    });
  },

  'func-avisos'() {
    document.querySelectorAll('.item-titulo').forEach(titulo => {
      titulo.addEventListener('click', () => {
        const abrir = titulo.getAttribute('aria-expanded') !== 'true';

        document.querySelectorAll('.item-titulo').forEach(t => {
          const ativo = t === titulo && abrir;
          t.setAttribute('aria-expanded', ativo);
          document.getElementById(t.getAttribute('aria-controls')).hidden = !ativo;
        });
      });
    });

    const token = sessionStorage.getItem('token');

    async function requisicao(caminho, opcoes = {}) {
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(opcoes.headers || {})
      };

      if (opcoes.body) headers['Content-Type'] = 'application/json';

      const resposta = await fetch(`${API}${caminho}`, {
        ...opcoes,
        headers
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(dados.error || dados.message || `Erro HTTP ${resposta.status}`);
      }

      return dados;
    }

    async function alterarStatus(tipo, id, status) {
      try {
        await requisicao(`/${tipo}/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });

        await desenhar();
      } catch (erro) {
        alert(`Nao foi possivel atualizar: ${erro.message}`);
      }
    }

    function linhaItem(i) {
      const li = el('li');

      li.append(el('strong', `${i.title} (${i.protocol})`));

      if (i.image) {
        const imagem = document.createElement('img');
        imagem.src = i.image;
        imagem.alt = `Foto de ${i.title}`;
        imagem.loading = 'lazy';
        imagem.style.maxWidth = '240px';
        imagem.style.maxHeight = '180px';
        imagem.style.objectFit = 'contain';
        imagem.style.display = 'block';
        imagem.style.margin = '10px 0';
        imagem.style.borderRadius = '8px';
        li.append(imagem);
      }

      if (i.description) li.append(el('div', i.description));
      if (i.category) li.append(el('div', `Categoria: ${i.category}`));
      if (i.location) li.append(el('div', `Local: ${i.location}`));
      li.append(el('div', `Situacao: ${i.status}`));

      if (i.status === 'Em análise') {
        li.append(botao('Procurar', () => alterarStatus('items', i.id, 'Procurando')));
      }

      if (i.status === 'Procurando') {
        li.append(botao('Encontrado', () => alterarStatus('items', i.id, 'Encontrado')));
      }

      if (i.status === 'Encontrado') {
        li.append(botao('Entregue', () => alterarStatus('items', i.id, 'Entregue')));
      }

      return li;
    }

    function linhaAviso(m) {
      const li = el('li');

      li.append(el('strong', m.title));
      li.append(el('div', m.description));
      li.append(el('div', `Protocolo: ${m.protocol}`));
      li.append(el('div', `Situacao: ${m.status}`));

      if (m.status !== 'Resolvida') {
        li.append(botao('Resolver', () => alterarStatus('notices', m.id, 'Resolvida')));
      }

      return li;
    }

    function preencher(seletor, registros, criarLinha) {
      const lista = $(seletor);

      lista.replaceChildren(
        ...(registros.length
          ? registros.map(criarLinha)
          : [el('li', 'Nenhum registro.')])
      );
    }

    async function desenhar() {
      try {
        const [dadosItens, dadosAvisos] = await Promise.all([
          requisicao('/items'),
          requisicao('/notices')
        ]);

        const itens = dadosItens.items || [];
        const avisos = dadosAvisos.notices || [];

        preencher(
          '#encontrados',
          itens.filter(i => i.status === 'Encontrado'),
          linhaItem
        );

        preencher(
          '#procura',
          itens.filter(i => ['Em análise', 'Procurando'].includes(i.status)),
          linhaItem
        );

        preencher(
          '#reclamacoes',
          avisos.filter(m => (m.title || '').toLowerCase().includes('reclam')),
          linhaAviso
        );

        preencher(
          '#informacoes',
          avisos.filter(m => (m.title || '').toLowerCase().includes('inform')),
          linhaAviso
        );
      } catch (erro) {
        ['#encontrados', '#procura', '#reclamacoes', '#informacoes'].forEach(seletor => {
          $(seletor).replaceChildren(el('li', `Erro ao carregar: ${erro.message}`));
        });
      }
    }

    desenhar();
  },
};

if (permitido) {
  if (pagina !== 'login') montarMenu();
  paginas[pagina]();
}
