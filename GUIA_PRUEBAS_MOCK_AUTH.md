# 🧪 Guía de Pruebas - Mock Auth

## ✅ Estado del Sistema

El servidor de desarrollo está configurado y funcionando con **Mock Auth** (sin Supabase).

## 🚀 Cómo Iniciar

1. **Abre una terminal** en la carpeta del proyecto:
   ```bash
   cd "/Users/santibecerraconti/Desktop/noba POC/noba-poc"
   ```

2. **Inicia el servidor** (si no está corriendo):
   ```bash
   npm run dev
   ```

3. **Espera** a que veas el mensaje:
   ```
   ✓ Ready in Xs
   ○ Local: http://localhost:3000
   ```

## 📍 Links Importantes

### Panel de Herramientas (Seed Panel)
```
http://localhost:3000/dev/auth-seed
```
**Este es el panel principal para crear usuarios de prueba**

### Páginas de Autenticación
```
http://localhost:3000/auth/login        # Login con email
http://localhost:3000/auth/otp         # Verificación OTP
http://localhost:3000/auth/activate     # Activación (requiere token)
```

### Dashboard
```
http://localhost:3000/app               # Dashboard (requiere login)
```

## 🧪 Pasos para Probar

### Caso 1: Usuario Interno (Más Simple)

1. **Abre el panel de seed:**
   - Ve a: `http://localhost:3000/dev/auth-seed`

2. **Crea un usuario interno:**
   - En "Add Internal User", ingresa: `test@noba.com`
   - Click en "Add Internal User (Auto-verified)"
   - ✅ El usuario se crea y se marca como verificado automáticamente

3. **Inicia sesión:**
   - Ve a: `http://localhost:3000/auth/login`
   - Ingresa el email: `test@noba.com`
   - Click en "Request OTP"
   - ✅ Deberías ver: "OTP sent! Redirecting to verification..."

4. **Verifica OTP:**
   - En la página de OTP, ingresa: `123456`
   - Click en "Verify & Sign in"
   - ✅ Deberías ser redirigido a `/app` y ver el dashboard

### Caso 2: Usuario Externo Invitado

1. **Abre el panel de seed:**
   - Ve a: `http://localhost:3000/dev/auth-seed`

2. **Crea una invitación:**
   - En "Create Invitation", ingresa:
     - Email: `user@example.com`
     - Collection ID: `collection-1` (o cualquier ID)
   - Click en "Create Invitation"
   - ✅ Se generará un "Activation URL"

3. **Copia el link de activación:**
   - Click en el botón de copiar (📋) junto al URL
   - O copia manualmente el URL mostrado

4. **Activa la invitación:**
   - Abre el link de activación en una nueva pestaña
   - ✅ Deberías ver: "Email verified successfully!"
   - ✅ Serás redirigido a `/auth/login` con el email pre-llenado

5. **Inicia sesión:**
   - El email ya está en el campo
   - Click en "Request OTP"
   - Ingresa OTP: `123456`
   - Click en "Verify & Sign in"
   - ✅ Deberías ser redirigido a `/app`

### Caso 3: Usuario NO Invitado (Bloqueo)

1. **Intenta login sin invitación:**
   - Ve a: `http://localhost:3000/auth/login`
   - Ingresa un email que NO esté invitado: `blocked@example.com`
   - Click en "Request OTP"
   - ✅ Deberías ver: "You need to be invited to access this platform"

## 🔑 OTP Code

**El código OTP fijo para pruebas es: `123456`**

En modo desarrollo, también se muestra en:
- Consola del navegador (F12 → Console)
- Mensaje en la página de OTP

## 🧹 Limpiar Datos

Si quieres empezar de cero:

1. Ve a: `http://localhost:3000/dev/auth-seed`
2. Scroll hasta "Danger Zone"
3. Click en "Clear All Mock Auth Data"
4. ✅ Todos los usuarios, invitaciones y sesiones se borrarán

## ⚠️ Solución de Problemas

### El servidor no inicia
```bash
# Detén procesos anteriores
pkill -f "next dev"

# Inicia de nuevo
npm run dev
```

### La página se queda cargando
- Verifica que el servidor esté corriendo (deberías ver logs en la terminal)
- Abre la consola del navegador (F12) para ver errores
- Intenta refrescar la página (Cmd+R o Ctrl+R)

### Error de localStorage
- Asegúrate de que estás usando un navegador moderno
- Verifica que no tengas bloqueado localStorage en tu navegador

### No puedo acceder a /dev/auth-seed
- Verifica que la ruta sea exactamente: `http://localhost:3000/dev/auth-seed`
- Asegúrate de que el servidor esté corriendo

## 📝 Notas

- **Todos los datos se guardan en localStorage** del navegador
- **Los datos persisten** entre recargas de página
- **Cada navegador tiene su propio localStorage** (datos no se comparten entre Chrome, Firefox, etc.)
- **El OTP expira después de 5 minutos**
- **Rate limiting**: máximo 3 requests de OTP en 10 minutos por email

## ✅ Checklist de Prueba

- [ ] Panel de seed se carga correctamente
- [ ] Puedo crear usuario interno
- [ ] Puedo crear invitación y copiar link
- [ ] Link de activación funciona
- [ ] Login con usuario interno funciona
- [ ] Login con usuario invitado funciona
- [ ] Bloqueo de usuario no invitado funciona
- [ ] OTP `123456` funciona
- [ ] Dashboard se muestra después de login
- [ ] Logout funciona

---

**¿Problemas?** Revisa la consola del navegador (F12) y la terminal donde corre el servidor.




