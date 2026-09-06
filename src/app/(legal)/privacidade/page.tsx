export const metadata = { title: "Política de Privacidade — Pregai" };

export default function Privacidade() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p className="text-muted-foreground">Última atualização: setembro de 2026.</p>

      <h2>1. Quem somos</h2>
      <p>
        O Pregai é uma plataforma que hospeda sites e ferramentas de gestão para
        igrejas. Cada igreja é responsável (controladora) pelos dados que coleta
        de seus visitantes e membros; o Pregai atua como operador desses dados,
        conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>2. Dados que tratamos</h2>
      <p>
        Cadastro de conta: nome, e-mail e, quando informado, telefone. Uso da
        plataforma: registros de acesso e ações para segurança e suporte.
      </p>
      <p>
        Dados fornecidos às igrejas através do site: pedidos de oração,
        formulários de visita e dados de membros. <strong>Pedidos de oração e a
        própria vinculação a uma igreja são dados pessoais sensíveis</strong>{" "}
        (revelam convicção religiosa e, por vezes, dados de saúde) e recebem
        proteção reforçada: acesso restrito à equipe pastoral autorizada,
        transmissão criptografada e opção de envio confidencial.
      </p>

      <h2>3. Base legal</h2>
      <p>
        Execução de contrato (conta e serviços), consentimento (dados sensíveis
        enviados voluntariamente, como pedidos de oração) e legítimo interesse
        (segurança e melhoria do serviço).
      </p>

      <h2>4. Compartilhamento</h2>
      <p>
        Não vendemos dados. Compartilhamos apenas com provedores de
        infraestrutura necessários à operação (hospedagem, banco de dados,
        autenticação, e-mail) e com a igreja à qual você se vinculou.
      </p>

      <h2>5. Retenção e exclusão</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa. Você pode solicitar
        exclusão a qualquer momento; os dados são removidos em até 30 dias, salvo
        obrigação legal de retenção.
      </p>

      <h2>6. Seus direitos</h2>
      <p>
        Confirmação de tratamento, acesso, correção, portabilidade, anonimização,
        eliminação e revogação de consentimento. Para exercê-los, contate a
        igreja responsável ou o suporte do Pregai.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Usamos criptografia em trânsito, controle de acesso por papéis (RLS) e
        princípio do menor privilégio. Nenhum sistema é 100% imune; em caso de
        incidente relevante, comunicaremos os titulares e a ANPD.
      </p>

      <h2>8. Contato</h2>
      <p>Dúvidas sobre privacidade: através do canal de suporte informado no rodapé.</p>
    </>
  );
}
