import { supabase } from './supabaseClient.js'

// Função para login do usuário
export async function login(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ 
    email: email, 
    password: senha 
  })
  
  if (error) {
    console.error('Erro no login:', error.message)
    throw new Error(error.message)
  }
  
  console.log('Login realizado com sucesso:', data)
  return data
}

// Função para cadastrar novo usuário
export async function cadastro() {
  const email = prompt('Digite seu e-mail para cadastro:')
  if (!email) return
  
  const senha = prompt('Digite sua senha (mínimo 6 caracteres):')
  if (!senha || senha.length < 6) {
    alert('Senha deve ter pelo menos 6 caracteres.')
    return
  }

  const { data, error } = await supabase.auth.signUp({ 
    email: email, 
    password: senha 
  })
  
  if (error) {
    alert('Erro no cadastro: ' + error.message)
  } else {
    alert('✅ Cadastro realizado! Verifique seu e-mail para confirmar.')
  }
}

// Função de logout
export async function logout() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}