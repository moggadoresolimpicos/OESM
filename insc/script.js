(function () {

  const SUPABASE_URL      = 'https://bxqfcktntwifyzfjjalx.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_3FWP3S0loab1dFITK0oGYg_bhQuaL08';
  const BUCKET            = 'inscricoes';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const form          = document.getElementById('sigma-form');
  const container     = document.getElementById('participants-container');
  const modal         = document.getElementById('confirm-modal');
  const statusOverlay = document.getElementById('status-overlay');
  const statusBox     = document.getElementById('status-box');

  let currentSize = 3;
  let fileData    = {};
  let lastJSON    = null;

  // ── Telas de status ───────────────────────────────────────────────
  function showLoading() {
    statusBox.innerHTML = `
      <div class="status-spinner"></div>
      <div class="status-title">Enviando inscrição...</div>
      <p class="status-desc">Aguarde enquanto enviamos os dados e os comprovantes.<br>Não feche esta página.</p>
    `;
    statusOverlay.classList.remove('hidden');
  }

  function showSuccess() {
    statusBox.innerHTML = `
      <div class="status-check">✓</div>
      <div class="status-title success">Inscrição realizada!</div>
      <p class="status-desc">
        Os dados da equipe <strong>${lastJSON.equipe.nome}</strong> foram enviados com sucesso.
      </p>
      <div class="status-email-note">
        <span>✉️</span>
        Um e-mail de confirmação será enviado em breve para
        <strong style="color:var(--text)">${lastJSON.equipe.email_contato}</strong>.
        Verifique também a caixa de spam.
      </div>
    `;
  }

  // ── Toggle visibilidade da senha ──────────────────────────────────
  document.getElementById('toggle-pw').addEventListener('click', function () {
    const pw = document.getElementById('team-password');
    const isHidden = pw.type === 'password';
    pw.type = isHidden ? 'text' : 'password';
    this.textContent = isHidden ? '🙈' : '👁';
  });

  // ── Máscara de telefone (equipe) ──────────────────────────────────
  document.getElementById('team-phone').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 11);
    if (v.length >= 7) {
      v = v.replace(/^(\d{2})(\d{4,5})(\d{0,4})$/, '($1) $2-$3');
    } else if (v.length >= 3) {
      v = v.replace(/^(\d{2})(\d+)$/, '($1) $2');
    }
    this.value = v;
  });

  // ── Build participant cards ───────────────────────────────────────
  function buildParticipants(count) {
    const existing = container.querySelectorAll('.participant-card');
    existing.forEach(c => {
      c.style.transition = 'opacity 0.2s, transform 0.2s';
      c.style.opacity    = '0';
      c.style.transform  = 'translateY(-10px)';
    });

    setTimeout(() => {
      container.innerHTML = '';
      for (let i = 0; i < count; i++) {
        container.appendChild(createParticipantCard(i));
      }
      container.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', handleFileChange);
      });
    }, existing.length ? 200 : 0);
  }

  function createParticipantCard(index) {
    const isLeader = index === 0;
    const div = document.createElement('div');
    div.className = 'participant-card' + (isLeader ? ' leader' : '');
    div.id = 'card-p' + index;

    div.innerHTML = `
      <div class="participant-header">
        <div class="participant-num">${index + 1}</div>
        <div class="participant-title">Participante ${index + 1}</div>
        ${isLeader ? '<span class="leader-badge">★ Líder</span>' : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;">

        <div class="field-group full">
          <div class="field">
            <label for="p${index}-name">Nome Completo</label>
            <input type="text" id="p${index}-name" name="p${index}-name" placeholder="Nome completo">
            <span class="field-error" id="err-p${index}-name"></span>
          </div>
        </div>

        <div class="field-group full">
          <div class="field">
            <label for="p${index}-dob">Data de Nascimento</label>
            <input type="date" id="p${index}-dob" name="p${index}-dob" placeholder="data">
            <span class="field-error" id="err-p${index}-dob"></span>
          </div>
        </div>

        <div class="field-group full">
          <div class="field">
            <label>Comprovante de Escolaridade (PDF ou imagem)</label>
            <div class="file-upload">
              <input type="file" id="p${index}-file" name="p${index}-file" accept=".pdf,image/*" data-index="${index}">
              <label class="file-upload-label" for="p${index}-file" id="file-label-p${index}">
                <span class="file-icon">📎</span>
                <span id="file-text-p${index}">Clique para selecionar arquivo</span>
              </label>
            </div>
            <span class="field-error" id="err-p${index}-file"></span>
          </div>
        </div>

      </div>
    `;

    return div;
  }

  function handleFileChange(e) {
    const index = e.target.dataset.index;
    const file  = e.target.files[0];
    const label = document.getElementById('file-label-p' + index);
    const text  = document.getElementById('file-text-p'  + index);
    const err   = document.getElementById('err-p' + index + '-file');

    if (file) {
      fileData['p' + index] = { name: file.name, type: file.type };
      label.classList.add('has-file');
      text.textContent = '✓ ' + file.name;
      err.textContent  = '';
      e.target.classList.remove('error');
    } else {
      delete fileData['p' + index];
      label.classList.remove('has-file');
      text.textContent = 'Clique para selecionar arquivo';
    }
  }

  // ── Radio: tamanho da equipe ──────────────────────────────────────
  document.querySelectorAll('input[name="team-size"]').forEach(r => {
    r.addEventListener('change', function () {
      currentSize = parseInt(this.value);
      fileData    = {};
      buildParticipants(currentSize);
    });
  });

  // ── Helpers de validação ──────────────────────────────────────────
  function setError(id, msg) {
    const el    = document.getElementById('err-' + id);
    const input = document.getElementById(id);
    if (el)    el.textContent = msg;
    if (input) msg ? input.classList.add('error') : input.classList.remove('error');
    return !!msg;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone) {
    const d = phone.replace(/\D/g, '');
    return d.length >= 10 && d.length <= 11;
  }

  function validateForm() {
    let hasError = false;

    const teamName     = document.getElementById('team-name').value.trim();
    const teamLevel    = document.getElementById('team-level').value;
    const teamEmail    = document.getElementById('team-email').value.trim();
    const teamPhone    = document.getElementById('team-phone').value.trim();
    const teamUf       = document.getElementById('team-uf').value;
    const teamPassword = document.getElementById('team-password').value;

    if (!teamName)
      hasError = setError('team-name', 'Informe o nome da equipe.') || hasError;
    else setError('team-name', '');

    if (!teamLevel)
      hasError = setError('team-level', 'Selecione o nível.') || hasError;
    else setError('team-level', '');

    if (!teamEmail || !isValidEmail(teamEmail))
      hasError = setError('team-email', 'Informe um e-mail de contato válido.') || hasError;
    else setError('team-email', '');

    if (!teamPhone || !isValidPhone(teamPhone))
      hasError = setError('team-phone', 'Informe um telefone de contato válido com DDD.') || hasError;
    else setError('team-phone', '');

    if (!teamUf)
      hasError = setError('team-uf', 'Selecione o estado.') || hasError;
    else setError('team-uf', '');

    if (!teamPassword || teamPassword.length < 6)
      hasError = setError('team-password', 'Crie uma senha com pelo menos 6 caracteres.') || hasError;
    else setError('team-password', '');

    for (let i = 0; i < currentSize; i++) {
      const name = document.getElementById('p' + i + '-name').value.trim();
      const dob  = document.getElementById('p' + i + '-dob').value;
      const file = document.getElementById('p' + i + '-file').files[0];

      if (!name)
        hasError = setError('p' + i + '-name', 'Informe o nome completo.') || hasError;
      else setError('p' + i + '-name', '');

      if (!dob)
        hasError = setError('p' + i + '-dob', 'Informe a data de nascimento.') || hasError;
      else setError('p' + i + '-dob', '');

      if (!file)
        hasError = setError('p' + i + '-file', 'Anexe o comprovante de escolaridade.') || hasError;
      else setError('p' + i + '-file', '');
    }

    return !hasError;
  }

  function buildJSON() {
    const participants = [];
    for (let i = 0; i < currentSize; i++) {
      participants.push({
        numero:          i + 1,
        lider:           i === 0,
        nome:            document.getElementById('p' + i + '-name').value.trim(),
        data_nascimento: document.getElementById('p' + i + '-dob').value,
        comprovante:     fileData['p' + i] ? fileData['p' + i].name : null
      });
    }

    return {
      equipe: {
        nome:                document.getElementById('team-name').value.trim(),
        nivel:               document.getElementById('team-level').value,
        email_contato:       document.getElementById('team-email').value.trim(),
        telefone_contato:    document.getElementById('team-phone').value.trim(),
        estado_uf:           document.getElementById('team-uf').value,
        senha:               document.getElementById('team-password').value,
        total_participantes: currentSize
      },
      participantes: participants
    };
  }

  // ── Supabase: upload de arquivos ──────────────────────────────────
  function buildFolderName(email) {
    return email.replace('@', '_') + '_data';
  }

  async function uploadFile(folderPath, fileName, file) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(`${folderPath}/${fileName}`, file, { upsert: true });

    if (error) throw new Error(`Erro ao enviar "${fileName}": ${error.message}`);
    return data.path;
  }

  async function uploadJSON(folderPath, jsonData) {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(`${folderPath}/inscricao.json`, blob, {
        contentType: 'application/json',
        upsert: true
      });

    if (error) throw new Error(`Erro ao enviar JSON: ${error.message}`);
    return data.path;
  }

  // ── Supabase: incrementar contador por número de participantes ────
  async function incrementarContador() {
    const { data, error: fetchError } = await supabase
      .from('contadores')
      .select('valor')
      .eq('id', 'total_inscricoes')
      .single();

    if (fetchError) throw new Error(`Erro ao ler contador: ${fetchError.message}`);

    const novoValor = data.valor + currentSize;

    const { error: updateError } = await supabase
      .from('contadores')
      .update({ valor: novoValor })
      .eq('id', 'total_inscricoes');

    if (updateError) throw new Error(`Erro ao atualizar contador: ${updateError.message}`);

    return novoValor;
  }

  // ── Supabase: orquestrador principal ─────────────────────────────
  async function submitToSupabase(jsonData) {
    const folderPath  = buildFolderName(jsonData.equipe.email_contato);
    const fileUploads = [];

    for (let i = 0; i < currentSize; i++) {
      const inputEl = document.getElementById('p' + i + '-file');
      if (!inputEl || !inputEl.files[0]) continue;

      const file     = inputEl.files[0];
      const ext      = file.name.split('.').pop();
      const fileName = `comprovante_participante_${i + 1}.${ext}`;

      fileUploads.push(
        uploadFile(folderPath, fileName, file).then(path => {
          jsonData.participantes[i].comprovante_storage = path;
        })
      );
    }

    await Promise.all(fileUploads);
    await uploadJSON(folderPath, jsonData);

    const novoTotal = await incrementarContador();

    jsonData._storage_path     = folderPath;
    jsonData._total_inscritos  = novoTotal;

    return jsonData;
  }

  // ── Modal de confirmação ──────────────────────────────────────────
  function openModal() {
    modal.classList.remove('hidden');
    document.getElementById('modal-confirm').focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  document.getElementById('modal-cancel').addEventListener('click', closeModal);

  document.getElementById('modal-confirm').addEventListener('click', async function () {
    closeModal();
    lastJSON = buildJSON();

    showLoading();

    try {
      lastJSON = await submitToSupabase(lastJSON);

      showSuccess();

      window.sigmaDownloadJSON = function () {
        const blob = new Blob([JSON.stringify(lastJSON, null, 2)], { type: 'application/json' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = 'inscricao-sigma-' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        console.log('%c✓ Download iniciado.', 'color:#4be8a0;font-weight:bold');
      };

      console.clear();
      console.log(
        '%cOlimpíada Sigma — Inscrição enviada ✓',
        'color:#4be8a0;font-family:serif;font-size:1.1rem;font-weight:bold'
      );
      console.log(
        `%cTotal de inscritos agora: ${lastJSON._total_inscritos} · Pasta: ${lastJSON._storage_path}`,
        'color:#e8b84b;font-size:0.85rem'
      );
      console.log('%cDados completos:', 'color:#7a8099;font-size:0.85rem');
      console.log(lastJSON);
      console.log(
        '%c─ Comandos ─────────────────────────────────────────\n' +
        '  sigmaDownloadJSON()   →  baixar JSON',
        'color:#4b7be8;font-size:0.85rem'
      );

    } catch (err) {
      console.error('%c✗ Erro no envio:', 'color:#e84b6a;font-weight:bold', err.message);

      statusOverlay.classList.add('hidden');

      const btnSubmit = document.querySelector('[type="submit"]');
      btnSubmit.textContent      = '✗ Erro ao enviar';
      btnSubmit.style.background = 'var(--error)';

      let errDiv = document.getElementById('submit-error-msg');
      if (!errDiv) {
        errDiv               = document.createElement('p');
        errDiv.id            = 'submit-error-msg';
        errDiv.style.cssText = 'color:var(--error);font-size:0.85rem;margin-top:10px;text-align:right;';
        document.querySelector('.form-actions').appendChild(errDiv);
      }
      errDiv.textContent = '⚠ ' + err.message;

      setTimeout(() => {
        btnSubmit.disabled         = false;
        btnSubmit.textContent      = 'Confirmar Inscrição →';
        btnSubmit.style.background = '';
      }, 4000);
    }
  });

  // ── Submit ────────────────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm()) return;
    openModal();
  });

  // ── Reset ─────────────────────────────────────────────────────────
  document.getElementById('btn-reset').addEventListener('click', function () {
    form.reset();
    fileData = {};
    lastJSON = null;

    statusOverlay.classList.add('hidden');

    container.querySelectorAll('.file-upload-label').forEach(l => {
      l.classList.remove('has-file');
      const txt = l.querySelector('span:last-child');
      if (txt) txt.textContent = 'Clique para selecionar arquivo';
    });

    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('input, select').forEach(el => el.classList.remove('error'));

    const togglePw = document.getElementById('toggle-pw');
    if (togglePw) {
      document.getElementById('team-password').type = 'password';
      togglePw.textContent = '👁';
    }

    const errDiv = document.getElementById('submit-error-msg');
    if (errDiv) errDiv.remove();

    const btnSubmit = document.querySelector('[type="submit"]');
    btnSubmit.disabled         = false;
    btnSubmit.style.background = '';
    btnSubmit.style.color      = '';
    btnSubmit.textContent      = 'Confirmar Inscrição →';

    delete window.sigmaDownloadJSON;
  });

  // ── Init ──────────────────────────────────────────────────────────
  buildParticipants(currentSize);
})();
