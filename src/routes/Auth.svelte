<script>
  import { supabase } from '../lib/supabase.js';

  let tab = 'signin'; // 'signin' | 'signup'
  let email = '';
  let password = '';
  let loading = false;
  let message = '';
  let isError = false;

  function setMsg(text, error = false) {
    message = text;
    isError = error;
  }

  async function handleSignIn() {
    if (!email || !password) return;
    loading = true;
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    loading = false;
    if (error) setMsg(error.message, true);
    // On success, onAuthStateChange in stores.js handles the transition
  }

  async function handleSignUp() {
    if (!email || !password) return;
    if (password.length < 6) { setMsg('Password must be at least 6 characters.', true); return; }
    loading = true;
    setMsg('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    loading = false;
    if (error) setMsg(error.message, true);
    else setMsg('Check your email for a confirmation link, then sign in.');
  }

  async function handlePasswordReset() {
    if (!email) { setMsg('Enter your email above first.', true); return; }
    loading = true;
    setMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    loading = false;
    if (error) setMsg(error.message, true);
    else setMsg('Password reset email sent — check your inbox.');
  }

  function submit() {
    if (tab === 'signin') handleSignIn();
    else handleSignUp();
  }
</script>

<div class="wrap">
  <div class="card card-surface">
    <div class="brand">
      <span class="logo" aria-hidden="true">🗓️</span>
      <h1>Habit Tracker</h1>
      <p class="tagline">Build streaks. Track progress.</p>
    </div>

    <div class="tabs">
      <button
        class="tab"
        class:active={tab === 'signin'}
        on:click={() => { tab = 'signin'; setMsg(''); }}
      >Sign in</button>
      <button
        class="tab"
        class:active={tab === 'signup'}
        on:click={() => { tab = 'signup'; setMsg(''); }}
      >Create account</button>
    </div>

    <form class="form" on:submit|preventDefault={submit}>
      <label class="field">
        <span class="label">Email</span>
        <input
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          autocomplete="email"
          required
        />
      </label>
      <label class="field">
        <span class="label">Password</span>
        <input
          type="password"
          bind:value={password}
          placeholder={tab === 'signup' ? 'Min. 6 characters' : ''}
          autocomplete={tab === 'signin' ? 'current-password' : 'new-password'}
          required
        />
      </label>

      {#if message}
        <p class="msg" class:error={isError}>{message}</p>
      {/if}

      <button
        type="submit"
        class="btn btn-primary btn-full"
        disabled={loading || !email || !password}
      >
        {#if loading}
          {tab === 'signin' ? 'Signing in…' : 'Creating account…'}
        {:else}
          {tab === 'signin' ? 'Sign in' : 'Create account'}
        {/if}
      </button>

      {#if tab === 'signin'}
        <button
          type="button"
          class="btn-link"
          on:click={handlePasswordReset}
          disabled={loading}
        >Forgot password?</button>
      {/if}
    </form>
  </div>
</div>

<style>
  .wrap {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px max(24px, env(safe-area-inset-bottom));
    background: var(--bg);
  }

  .card {
    width: 100%;
    max-width: 400px;
    padding: 28px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .brand {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .logo {
    font-size: 40px;
    line-height: 1;
  }

  .brand h1 {
    font-size: 22px;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .tagline {
    margin: 0;
    font-size: 13px;
    color: var(--fg-muted);
  }

  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    background: var(--bg-soft);
    border-radius: var(--radius-sm);
    padding: 4px;
  }

  .tab {
    border: none;
    background: transparent;
    color: var(--fg-muted);
    padding: 8px 10px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    min-height: 36px;
  }

  .tab.active {
    background: var(--bg-elevated);
    color: var(--fg);
    box-shadow: var(--shadow);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label {
    font-size: 13px;
    font-weight: 600;
    color: var(--fg-muted);
  }

  .msg {
    margin: 0;
    font-size: 13px;
    color: var(--success);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--success) 12%, transparent);
  }

  .msg.error {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
  }

  .btn-link {
    background: none;
    border: none;
    color: var(--accent);
    font-weight: 600;
    font-size: 13px;
    text-align: center;
    padding: 4px;
    cursor: pointer;
    align-self: center;
  }

  .btn-link:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
