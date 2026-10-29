import { Locale } from './types';

export interface Translations {
  brand: {
    name: string;
    version: string;
  };
  auth: {
    signInTitle: string;
    registerTitle: string;
    forgotTitle: string;
    resetTitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    nameLabel: string;
    namePlaceholder: string;
    departmentLabel: string;
    departmentPlaceholder: string;
    newPasswordLabel: string;
    resetTokenLabel: string;
    resetTokenPlaceholder: string;
    signInButton: string;
    registerButton: string;
    sendRecoveryButton: string;
    confirmResetButton: string;
    forgotPasswordLink: string;
    createAccountLink: string;
    backToSignInLink: string;
    haveResetTokenLink: string;
    quickAccessLabel: string;
    quickAdminButton: string;
    quickClientButton: string;
    recoverySentMessage: string;
    resetSuccessMessage: string;
    slides: {
      title: string;
      description: string;
      metricLabel: string;
      metricValue: string;
    }[];
  };
  nav: {
    dashboard: string;
    users: string;
    profile: string;
    signOut: string;
    roleAdmin: string;
    roleClient: string;
  };
  dashboard: {
    title: string;
    range7d: string;
    range14d: string;
    range30d: string;
    metricUsers: string;
    metricLogins: string;
    metricActions: string;
    metricActiveUsers: string;
    chartUsersTitle: string;
    chartLoginsTitle: string;
    chartActionsTitle: string;
    logsTitle: string;
    logsSearchPlaceholder: string;
    logsFilterAll: string;
    logsColTimestamp: string;
    logsColActor: string;
    logsColAction: string;
    logsColCategory: string;
    logsColResource: string;
    logsColIp: string;
    logsColLatency: string;
    logsColStatus: string;
    logsEmpty: string;
    infraTitle: string;
    infraDatabase: string;
    infraQueueCache: string;
    infraSecurity: string;
    infraLlmTitle: string;
    infraMailTitle: string;
    enqueueJobButton: string;
    testLlmButton: string;
    testWebhookButton: string;
    llmPromptPlaceholder: string;
  };
  users: {
    title: string;
    newUserButton: string;
    searchPlaceholder: string;
    filterAllRoles: string;
    colName: string;
    colEmail: string;
    colRole: string;
    colDepartment: string;
    colStatus: string;
    colLastLogin: string;
    colActions: string;
    statusActive: string;
    statusSuspended: string;
    editButton: string;
    deleteButton: string;
    modalCreateTitle: string;
    modalEditTitle: string;
    saveButton: string;
    cancelButton: string;
    emptyState: string;
  };
  profile: {
    title: string;
    personalDataTitle: string;
    securityPasswordTitle: string;
    sessionTokenTitle: string;
    saveProfileButton: string;
    updatePasswordButton: string;
    currentPasswordLabel: string;
    newPasswordLabel: string;
    languageLabel: string;
    roleLabel: string;
    statusLabel: string;
    userIdLabel: string;
    lastLoginLabel: string;
    createdAtLabel: string;
    savedFeedback: string;
    passwordUpdatedFeedback: string;
  };
}

export const translations: Record<Locale, Translations> = {
  'pt-BR': {
    brand: {
      name: 'Kore Base',
      version: 'v1.0',
    },
    auth: {
      signInTitle: 'Acesse sua conta',
      registerTitle: 'Criar nova conta',
      forgotTitle: 'Recuperação de senha',
      resetTitle: 'Redefinir senha com token',
      emailLabel: 'Endereço de e-mail',
      emailPlaceholder: 'nome@empresa.com',
      passwordLabel: 'Senha',
      passwordPlaceholder: 'Digite sua senha',
      nameLabel: 'Nome completo',
      namePlaceholder: 'Ex: Rafael Costa',
      departmentLabel: 'Departamento',
      departmentPlaceholder: 'Ex: Engenharia',
      newPasswordLabel: 'Nova senha',
      resetTokenLabel: 'Token de recuperação',
      resetTokenPlaceholder: 'Cole o código recebido',
      signInButton: 'Entrar na plataforma',
      registerButton: 'Concluir cadastro',
      sendRecoveryButton: 'Enviar instruções por e-mail',
      confirmResetButton: 'Salvar nova senha',
      forgotPasswordLink: 'Esqueceu a senha?',
      createAccountLink: 'Criar conta',
      backToSignInLink: 'Voltar para o login',
      haveResetTokenLink: 'Já possui um token de recuperação?',
      quickAccessLabel: 'Acesso rápido de demonstração',
      quickAdminButton: 'Preencher Admin',
      quickClientButton: 'Preencher Cliente',
      recoverySentMessage: 'Token de recuperação gerado e despachado via serviço de e-mail.',
      resetSuccessMessage: 'Senha atualizada com sucesso. Faça login com sua nova credencial.',
      slides: [
        {
          title: 'Arquitetura Base PostgreSQL & Filas BullMQ',
          description: 'Camada de persistência relacional padronizada com suporte opcional a cache Redis e processamento assíncrono resiliente.',
          metricLabel: 'Latência média de consulta',
          metricValue: '1.8 ms',
        },
        {
          title: 'Segurança Blindada em Todas as Camadas',
          description: 'Assinatura JWT HS256, proteção de rotas por nível de acesso (RBAC), validação HMAC para webhooks e rate limiting adaptativo.',
          metricLabel: 'Validação criptográfica',
          metricValue: 'SHA-256 / Scrypt',
        },
        {
          title: 'Gateway Multi-LLM e Auditoria Completa',
          description: 'Integração nativa no servidor para Google Gemini, OpenRouter e Meta Llama com rastreabilidade integral de eventos.',
          metricLabel: 'Provedores integrados',
          metricValue: 'Gemini · OpenRouter · Llama',
        },
      ],
    },
    nav: {
      dashboard: 'Dashboard',
      users: 'Usuários',
      profile: 'Perfil',
      signOut: 'Sair',
      roleAdmin: 'Administrador',
      roleClient: 'Cliente',
    },
    dashboard: {
      title: 'Dashboard de Métricas',
      range7d: '7 dias',
      range14d: '14 dias',
      range30d: '30 dias',
      metricUsers: 'Total de Usuários',
      metricLogins: 'Logins no Período',
      metricActions: 'Ações Executadas',
      metricActiveUsers: 'Usuários Ativos',
      chartUsersTitle: 'Crescimento de Usuários',
      chartLoginsTitle: 'Volume de Logins Diários',
      chartActionsTitle: 'Ações e Requisições Auditadas',
      logsTitle: 'Logs de Auditoria do Sistema',
      logsSearchPlaceholder: 'Filtrar por usuário, ação, rota ou IP...',
      logsFilterAll: 'Todas as categorias',
      logsColTimestamp: 'Data / Hora',
      logsColActor: 'Usuário',
      logsColAction: 'Ação',
      logsColCategory: 'Módulo',
      logsColResource: 'Recurso',
      logsColIp: 'Endereço IP',
      logsColLatency: 'Duração',
      logsColStatus: 'Status',
      logsEmpty: 'Nenhum registro de log encontrado para os filtros aplicados.',
      infraTitle: 'Infraestrutura, Filas, Segurança e LLMs',
      infraDatabase: 'Banco de Dados (PostgreSQL)',
      infraQueueCache: 'Filas & Cache (BullMQ / Redis)',
      infraSecurity: 'Políticas de Segurança & Rate Limit',
      infraLlmTitle: 'Gateway Multi-LLM (Gemini, OpenRouter, Llama)',
      infraMailTitle: 'Serviço de E-mail (Resend / SMTP)',
      enqueueJobButton: 'Enfileirar Job BullMQ',
      testLlmButton: 'Executar Prompt',
      testWebhookButton: 'Validar Webhook HMAC',
      llmPromptPlaceholder: 'Digite uma instrução para testar o provedor LLM selecionado...',
    },
    users: {
      title: 'Gerenciamento de Usuários',
      newUserButton: 'Novo usuário',
      searchPlaceholder: 'Buscar por nome, e-mail ou departamento...',
      filterAllRoles: 'Todos os níveis',
      colName: 'Nome',
      colEmail: 'E-mail',
      colRole: 'Nível (Role)',
      colDepartment: 'Departamento',
      colStatus: 'Status',
      colLastLogin: 'Último Login',
      colActions: 'Ações',
      statusActive: 'Ativo',
      statusSuspended: 'Suspenso',
      editButton: 'Editar',
      deleteButton: 'Excluir',
      modalCreateTitle: 'Adicionar Usuário',
      modalEditTitle: 'Editar Usuário',
      saveButton: 'Salvar alterações',
      cancelButton: 'Cancelar',
      emptyState: 'Nenhum usuário corresponde aos critérios de busca.',
    },
    profile: {
      title: 'Meu Perfil',
      personalDataTitle: 'Dados da Conta',
      securityPasswordTitle: 'Alterar Senha',
      sessionTokenTitle: 'Sessão e Credenciais de Segurança',
      saveProfileButton: 'Salvar perfil',
      updatePasswordButton: 'Atualizar senha',
      currentPasswordLabel: 'Senha atual',
      newPasswordLabel: 'Nova senha (mín. 8 caracteres)',
      languageLabel: 'Idioma da interface',
      roleLabel: 'Nível de permissão',
      statusLabel: 'Status da conta',
      userIdLabel: 'Identificador único (UUID)',
      lastLoginLabel: 'Última autenticação',
      createdAtLabel: 'Data de criação',
      savedFeedback: 'Dados do perfil atualizados com sucesso.',
      passwordUpdatedFeedback: 'Senha alterada com sucesso.',
    },
  },
  es: {
    brand: {
      name: 'Kore Base',
      version: 'v1.0',
    },
    auth: {
      signInTitle: 'Acceda a su cuenta',
      registerTitle: 'Crear nueva cuenta',
      forgotTitle: 'Recuperación de contraseña',
      resetTitle: 'Restablecer contraseña con token',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'nombre@empresa.com',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Ingrese su contraseña',
      nameLabel: 'Nombre completo',
      namePlaceholder: 'Ej: Carlos Méndez',
      departmentLabel: 'Departamento',
      departmentPlaceholder: 'Ej: Ingeniería',
      newPasswordLabel: 'Nueva contraseña',
      resetTokenLabel: 'Token de recuperación',
      resetTokenPlaceholder: 'Pegue el código recibido',
      signInButton: 'Iniciar sesión',
      registerButton: 'Completar registro',
      sendRecoveryButton: 'Enviar instrucciones por correo',
      confirmResetButton: 'Guardar nueva contraseña',
      forgotPasswordLink: '¿Olvidó su contraseña?',
      createAccountLink: 'Crear cuenta',
      backToSignInLink: 'Volver al inicio de sesión',
      haveResetTokenLink: '¿Ya tiene un token de recuperación?',
      quickAccessLabel: 'Acceso rápido de demostración',
      quickAdminButton: 'Autocompletar Admin',
      quickClientButton: 'Autocompletar Cliente',
      recoverySentMessage: 'Token de recuperación generado y enviado por el servicio de correo.',
      resetSuccessMessage: 'Contraseña actualizada correctamente. Inicie sesión con su nueva credencial.',
      slides: [
        {
          title: 'Arquitectura Base PostgreSQL y Colas BullMQ',
          description: 'Capa de persistencia relacional estandarizada con soporte opcional para caché Redis y procesamiento asíncrono.',
          metricLabel: 'Latencia media de consulta',
          metricValue: '1.8 ms',
        },
        {
          title: 'Seguridad Blindada en Todas las Capas',
          description: 'Firma JWT HS256, control de acceso basado en roles (RBAC), validación HMAC para webhooks y rate limiting adaptativo.',
          metricLabel: 'Validación criptográfica',
          metricValue: 'SHA-256 / Scrypt',
        },
        {
          title: 'Gateway Multi-LLM y Auditoría Completa',
          description: 'Integración nativa en servidor para Google Gemini, OpenRouter y Meta Llama con trazabilidad total de eventos.',
          metricLabel: 'Proveedores integrados',
          metricValue: 'Gemini · OpenRouter · Llama',
        },
      ],
    },
    nav: {
      dashboard: 'Dashboard',
      users: 'Usuarios',
      profile: 'Perfil',
      signOut: 'Salir',
      roleAdmin: 'Administrador',
      roleClient: 'Cliente',
    },
    dashboard: {
      title: 'Dashboard de Métricas',
      range7d: '7 días',
      range14d: '14 días',
      range30d: '30 días',
      metricUsers: 'Total de Usuarios',
      metricLogins: 'Inicios de Sesión',
      metricActions: 'Acciones Ejecutadas',
      metricActiveUsers: 'Usuarios Activos',
      chartUsersTitle: 'Crecimiento de Usuarios',
      chartLoginsTitle: 'Volumen de Inicios de Sesión Diarios',
      chartActionsTitle: 'Acciones y Solicitudes Auditadas',
      logsTitle: 'Registros de Auditoría del Sistema',
      logsSearchPlaceholder: 'Filtrar por usuario, acción, ruta o IP...',
      logsFilterAll: 'Todas las categorías',
      logsColTimestamp: 'Fecha / Hora',
      logsColActor: 'Usuario',
      logsColAction: 'Acción',
      logsColCategory: 'Módulo',
      logsColResource: 'Recurso',
      logsColIp: 'Dirección IP',
      logsColLatency: 'Duración',
      logsColStatus: 'Estado',
      logsEmpty: 'No se encontraron registros para los filtros seleccionados.',
      infraTitle: 'Infraestructura, Colas, Seguridad y LLMs',
      infraDatabase: 'Base de Datos (PostgreSQL)',
      infraQueueCache: 'Colas y Caché (BullMQ / Redis)',
      infraSecurity: 'Políticas de Seguridad y Rate Limit',
      infraLlmTitle: 'Gateway Multi-LLM (Gemini, OpenRouter, Llama)',
      infraMailTitle: 'Servicio de Correo (Resend / SMTP)',
      enqueueJobButton: 'Encolar Trabajo BullMQ',
      testLlmButton: 'Ejecutar Prompt',
      testWebhookButton: 'Validar Webhook HMAC',
      llmPromptPlaceholder: 'Escriba una instrucción para probar el proveedor LLM seleccionado...',
    },
    users: {
      title: 'Gestión de Usuarios',
      newUserButton: 'Nuevo usuario',
      searchPlaceholder: 'Buscar por nombre, correo o departamento...',
      filterAllRoles: 'Todos los roles',
      colName: 'Nombre',
      colEmail: 'Correo',
      colRole: 'Rol',
      colDepartment: 'Departamento',
      colStatus: 'Estado',
      colLastLogin: 'Último Acceso',
      colActions: 'Acciones',
      statusActive: 'Activo',
      statusSuspended: 'Suspendido',
      editButton: 'Editar',
      deleteButton: 'Eliminar',
      modalCreateTitle: 'Añadir Usuario',
      modalEditTitle: 'Editar Usuario',
      saveButton: 'Guardar cambios',
      cancelButton: 'Cancelar',
      emptyState: 'Ningún usuario coincide con los criterios de búsqueda.',
    },
    profile: {
      title: 'Mi Perfil',
      personalDataTitle: 'Datos de la Cuenta',
      securityPasswordTitle: 'Cambiar Contraseña',
      sessionTokenTitle: 'Sesión y Credenciales de Seguridad',
      saveProfileButton: 'Guardar perfil',
      updatePasswordButton: 'Actualizar contraseña',
      currentPasswordLabel: 'Contraseña actual',
      newPasswordLabel: 'Nueva contraseña (mín. 8 caracteres)',
      languageLabel: 'Idioma de la interfaz',
      roleLabel: 'Nivel de permiso',
      statusLabel: 'Estado de la cuenta',
      userIdLabel: 'Identificador único (UUID)',
      lastLoginLabel: 'Última autenticación',
      createdAtLabel: 'Fecha de creación',
      savedFeedback: 'Datos del perfil actualizados correctamente.',
      passwordUpdatedFeedback: 'Contraseña actualizada correctamente.',
    },
  },
  en: {
    brand: {
      name: 'Kore Base',
      version: 'v1.0',
    },
    auth: {
      signInTitle: 'Sign in to your account',
      registerTitle: 'Create a new account',
      forgotTitle: 'Password recovery',
      resetTitle: 'Reset password with token',
      emailLabel: 'Email address',
      emailPlaceholder: 'name@company.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      nameLabel: 'Full name',
      namePlaceholder: 'e.g. Alex Morgan',
      departmentLabel: 'Department',
      departmentPlaceholder: 'e.g. Engineering',
      newPasswordLabel: 'New password',
      resetTokenLabel: 'Recovery token',
      resetTokenPlaceholder: 'Paste your recovery token',
      signInButton: 'Sign in to platform',
      registerButton: 'Complete registration',
      sendRecoveryButton: 'Send recovery instructions',
      confirmResetButton: 'Save new password',
      forgotPasswordLink: 'Forgot password?',
      createAccountLink: 'Create account',
      backToSignInLink: 'Back to sign in',
      haveResetTokenLink: 'Already have a recovery token?',
      quickAccessLabel: 'Quick demo credentials',
      quickAdminButton: 'Fill Admin',
      quickClientButton: 'Fill Client',
      recoverySentMessage: 'Recovery token generated and dispatched via mail service.',
      resetSuccessMessage: 'Password updated successfully. Sign in with your new credentials.',
      slides: [
        {
          title: 'PostgreSQL Core & BullMQ Queue Architecture',
          description: 'Standardized relational persistence layer with optional Redis caching and resilient background job processing.',
          metricLabel: 'Average query latency',
          metricValue: '1.8 ms',
        },
        {
          title: 'Hardened Multi-Layer Security',
          description: 'HS256 JWT signing, strict Role-Based Access Control (RBAC), HMAC webhook verification, and adaptive rate limiting.',
          metricLabel: 'Cryptographic validation',
          metricValue: 'SHA-256 / Scrypt',
        },
        {
          title: 'Multi-LLM Gateway & Full Audit Trail',
          description: 'Server-side native integration for Google Gemini, OpenRouter, and Meta Llama with end-to-end event logging.',
          metricLabel: 'Integrated providers',
          metricValue: 'Gemini · OpenRouter · Llama',
        },
      ],
    },
    nav: {
      dashboard: 'Dashboard',
      users: 'Users',
      profile: 'Profile',
      signOut: 'Sign out',
      roleAdmin: 'Administrator',
      roleClient: 'Client',
    },
    dashboard: {
      title: 'Metrics Dashboard',
      range7d: '7 days',
      range14d: '14 days',
      range30d: '30 days',
      metricUsers: 'Total Users',
      metricLogins: 'Period Logins',
      metricActions: 'Executed Actions',
      metricActiveUsers: 'Active Users',
      chartUsersTitle: 'User Growth',
      chartLoginsTitle: 'Daily Login Volume',
      chartActionsTitle: 'Audited Actions & Requests',
      logsTitle: 'System Audit Logs',
      logsSearchPlaceholder: 'Filter by user, action, route, or IP...',
      logsFilterAll: 'All categories',
      logsColTimestamp: 'Timestamp',
      logsColActor: 'Actor',
      logsColAction: 'Action',
      logsColCategory: 'Module',
      logsColResource: 'Resource',
      logsColIp: 'IP Address',
      logsColLatency: 'Duration',
      logsColStatus: 'Status',
      logsEmpty: 'No log entries match the applied filters.',
      infraTitle: 'Infrastructure, Queues, Security & LLMs',
      infraDatabase: 'Database (PostgreSQL)',
      infraQueueCache: 'Queues & Cache (BullMQ / Redis)',
      infraSecurity: 'Security Policies & Rate Limit',
      infraLlmTitle: 'Multi-LLM Gateway (Gemini, OpenRouter, Llama)',
      infraMailTitle: 'Mail Service (Resend / SMTP)',
      enqueueJobButton: 'Enqueue BullMQ Job',
      testLlmButton: 'Run Prompt',
      testWebhookButton: 'Verify HMAC Webhook',
      llmPromptPlaceholder: 'Enter a prompt to test the selected LLM provider...',
    },
    users: {
      title: 'User Management',
      newUserButton: 'New user',
      searchPlaceholder: 'Search by name, email, or department...',
      filterAllRoles: 'All roles',
      colName: 'Name',
      colEmail: 'Email',
      colRole: 'Role',
      colDepartment: 'Department',
      colStatus: 'Status',
      colLastLogin: 'Last Login',
      colActions: 'Actions',
      statusActive: 'Active',
      statusSuspended: 'Suspended',
      editButton: 'Edit',
      deleteButton: 'Delete',
      modalCreateTitle: 'Add User',
      modalEditTitle: 'Edit User',
      saveButton: 'Save changes',
      cancelButton: 'Cancel',
      emptyState: 'No users match the current search criteria.',
    },
    profile: {
      title: 'My Profile',
      personalDataTitle: 'Account Details',
      securityPasswordTitle: 'Change Password',
      sessionTokenTitle: 'Session & Security Credentials',
      saveProfileButton: 'Save profile',
      updatePasswordButton: 'Update password',
      currentPasswordLabel: 'Current password',
      newPasswordLabel: 'New password (min. 8 characters)',
      languageLabel: 'Interface language',
      roleLabel: 'Permission level',
      statusLabel: 'Account status',
      userIdLabel: 'Unique identifier (UUID)',
      lastLoginLabel: 'Last authentication',
      createdAtLabel: 'Created at',
      savedFeedback: 'Profile details updated successfully.',
      passwordUpdatedFeedback: 'Password updated successfully.',
    },
  },
};
