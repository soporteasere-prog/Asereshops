function doPost(e) {
  let data;
  try {
    // Intenta parsear los datos JSON del cuerpo de la solicitud POST.
    data = JSON.parse(e.postData.contents);
    Logger.log('✅ Datos recibidos y parseados correctamente: ' + JSON.stringify(data));
  } catch (error) {
    // Si hay un error al parsear el JSON, registra el error y devuelve una respuesta de error.
    Logger.log('❌ Error al parsear los datos JSON: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Error al parsear los datos JSON." })).setMimeType(ContentService.MimeType.JSON);
  }

  // --- Configuración del correo ---
  // Dirección de correo donde se enviarán las órdenes de pedido internas. ¡Asegúrate de que sea correcta!
  const destinatario = "soporte.asere@gmail.com";
  // Asunto claro y directo para una orden de pedido interna.
  const asunto = "🚨 NUEVO PEDIDO - Asere - 🚨";

  // --- Extracción y Asignación de Datos del Pedido ---
  // Se extraen los datos del objeto 'data' recibido. Se proporcionan valores por defecto
  // para asegurar que el correo siempre tenga contenido, incluso si algún campo está ausente.
  const pais = data.pais || "N/A";
  const origen = data.origen || "N/A";
  const afiliado = data.afiliado || "Ninguno"; // 'afiliado' se espera como string (nombre)
  const nombreComprador = data.nombre_comprador || "Desconocido";
  const nombrePersonaEntrega = data.nombre_persona_entrega || "Sin nombre de persona a entregar";
  const telefonoPersonaEntrega = data.telefono_persona_entrega || "N/A";
  const telefonoComprador = data.telefono_comprador || "N/A";
  const correoComprador = data.correo_comprador || "N/A";
  const direccionEnvio = data.direccion_envio || "N/A";
  const compras = data.compras || []; // Se espera un array de objetos de compra
  const precioCompraTotal = parseFloat(data.precio_compra_total || "0.00").toFixed(2); // Asegura formato de moneda
  const navegador = data.navegador || "Desconocido";
  const sistemaOperativo = data.sistema_operativo || "Desconocido";
  const fuenteTrafico = data.fuente_trafico || "Directo";

  // Formatea la fecha del pedido a un formato legible.
  const fechaPedidoRaw = data.fecha_pedido;
  let fechaPedidoFormateada = "N/A";
  if (fechaPedidoRaw) {
    try {
      fechaPedidoFormateada = new Date(fechaPedidoRaw).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      Logger.log('❌ Error al formatear la fecha del pedido: ' + e.message);
      fechaPedidoFormateada = "Fecha inválida";
    }
  }

  // Genera un número de pedido único.
  // NOTA: Para un sistema de producción, este ID debería generarse y persistirse
  // en tu base de datos o sistema de pedidos para asegurar su unicidad y trazabilidad.
  // Aquí se genera dinámicamente para el correo interno.
  const numeroPedido = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // --- Preparación del Contenido HTML de la Tabla de Artículos ---
  let itemsTableRows = '';
  if (Array.isArray(compras) && compras.length > 0) {
    compras.forEach(item => {
      // Extrae y valida las propiedades de cada artículo de compra.
      const itemName = item.name || 'Producto Desconocido';
      const itemQuantity = parseInt(item.quantity) || 0;
      const itemUnitPrice = (item.unitPrice !== undefined && item.unitPrice !== null) ? parseFloat(item.unitPrice).toFixed(2) : '0.00';
      const itemTotalPrice = (parseFloat(itemUnitPrice) * itemQuantity).toFixed(2);

      itemsTableRows += `
        <tr style="background-color: #ffffff;">
          <td data-label="Artículo" style="padding: 12px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #1E1E1E;">${itemName}</td>
          <td data-label="Cantidad" style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: center; font-size: 14px; color: #1E1E1E;">${itemQuantity}</td>
          <td data-label="Precio" style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; font-size: 14px; color: #1E1E1E;">$${itemUnitPrice}</td>
          <td data-label="Total" style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right; font-size: 14px; color: #1E1E1E;">$${itemTotalPrice}</td>
        </tr>
      `;
    });
  } else {
    itemsTableRows += `
      <tr style="background-color: #ffffff;">
        <td colspan="4" style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: center; font-size: 14px; color: #1E1E1E;">No se especificaron productos en este pedido.</td>
      </tr>
    `;
  }

  // --- Construcción del Mensaje HTML Completo ---
  const mensajeHTML = `
    <div style="width:100%;background-color:#f3f7f7;padding:16px 0;margin:0;">
      <style type="text/css">
        @media only screen and (max-width: 620px) {
          .email-wrapper {width:100% !important;}
          .email-content {padding:20px !important;}
          .responsive-table thead {display:none !important;}
          .responsive-table tr {display:block !important;width:100% !important;}
          .responsive-table td {display:block !important;width:100% !important;text-align:left !important;box-sizing:border-box;}
          .responsive-table td::before {content: attr(data-label);display:block;font-weight:700;margin-bottom:4px;color:#012a2f;}
          .button {width:100% !important;}
        }
      </style>
      <table class="email-wrapper" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color:#0d4d51;padding:24px 20px;text-align:center;">
            <h1 style="margin:0;font-size:28px;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">ASERE</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#c7f0ef;opacity:0.95;">Notificación de pedido</p>
          </td>
        </tr>
        <tr>
          <td class="email-content" style="padding:28px 32px 24px;background:#ffffff;">
            <h2 style="margin:0 0 16px;font-size:22px;color:#0d3b43;">Nuevo pedido recibido</h2>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#475859;">Un nuevo pedido ha sido registrado en el sistema. Encuentra a continuación los datos clave y la información del envío.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
              <tr>
                <td style="background:#effbf9;padding:18px;border-radius:10px;border:1px solid #d9f0ee;color:#0f3f43;">
                  <p style="margin:0 0 8px;font-size:14px;"><strong style="color:#0a6f6a;">Número de pedido:</strong> ${numeroPedido}</p>
                  <p style="margin:0 0 8px;font-size:14px;"><strong style="color:#0a6f6a;">Fecha:</strong> ${fechaPedidoFormateada}</p>
                  <p style="margin:0;font-size:14px;"><strong style="color:#0a6f6a;">Origen:</strong> <a href="${origen}" style="color:#00796b;text-decoration:none;word-break:break-all;">${origen}</a></p>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
              <tr>
                <td style="padding:0 0 10px;">
                  <h3 style="margin:0;font-size:18px;color:#00796b;">Datos del comprador</h3>
                </td>
              </tr>
              <tr>
                <td style="background:#f7fcfc;padding:18px;border-radius:10px;border:1px solid #d8eeeb;color:#184047;">
                  <p style="margin:0 0 8px;font-size:14px;"><strong>Nombre:</strong> ${nombreComprador}</p>
                  <p style="margin:0 0 8px;font-size:14px;"><strong>Correo:</strong> <a href="mailto:${correoComprador}" style="color:#0f6f69;text-decoration:none;">${correoComprador}</a></p>
                  <p style="margin:0 0 8px;font-size:14px;"><strong>Teléfono:</strong> ${telefonoComprador}</p>
                  <p style="margin:0 0 8px;font-size:14px;"><strong>Dirección:</strong> ${direccionEnvio}</p>
                  <p style="margin:0 0 8px;font-size:14px;"><strong>Receptor:</strong> ${nombrePersonaEntrega}</p>
                  <p style="margin:0 0 8px;font-size:14px;"><strong>Teléfono receptor:</strong> ${telefonoPersonaEntrega}</p>
                  <p style="margin:0;font-size:14px;"><strong>Afiliado:</strong> ${afiliado}</p>
                </td>
              </tr>
            </table>

            <h3 style="margin:0 0 14px;font-size:18px;color:#00796b;">Listado de artículos</h3>
            <table class="responsive-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:24px;">
              <thead>
                <tr style="background:#0d4d51;color:#ffffff;text-align:left;">
                  <th style="padding:12px 10px;font-size:13px;">Artículo</th>
                  <th style="padding:12px 10px;font-size:13px;text-align:center;">Cantidad</th>
                  <th style="padding:12px 10px;font-size:13px;text-align:right;">Precio</th>
                  <th style="padding:12px 10px;font-size:13px;text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsTableRows}
              </tbody>
              <tfoot>
                <tr style="background:#edf7f7;">
                  <td colspan="3" style="padding:14px 10px;font-size:14px;font-weight:700;text-align:right;color:#1e3d41;">Subtotal</td>
                  <td style="padding:14px 10px;font-size:14px;font-weight:700;text-align:right;color:#1e3d41;">$${precioCompraTotal}</td>
                </tr>
                <tr style="background:#0d4d51;color:#ffffff;">
                  <td colspan="3" style="padding:14px 10px;font-size:15px;font-weight:700;text-align:right;">TOTAL</td>
                  <td style="padding:14px 10px;font-size:15px;font-weight:700;text-align:right;">$${precioCompraTotal}</td>
                </tr>
              </tfoot>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#effbf9;padding:18px;border-radius:10px;border:1px solid #d7eeec;color:#164044;">
                  <h3 style="margin:0 0 12px;font-size:18px;color:#00796b;">Información técnica</h3>
                  <p style="margin:0 0 8px;font-size:14px;"><strong>Navegador:</strong> ${navegador}</p>
                  <p style="margin:0 0 8px;font-size:14px;"><strong>SO:</strong> ${sistemaOperativo}</p>
                  <p style="margin:0;font-size:14px;"><strong>Fuente de tráfico:</strong> ${fuenteTrafico}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 6px;font-size:13px;color:#546d70;">Revisa este pedido en el panel administrativo y continúa con el procesamiento.</p>
            <p style="margin:0;font-size:12px;color:#8a9a9d;">Correo automático generado por el sistema de pedidos de Asere.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 30px 28px;background:#e3f3f2;text-align:center;color:#4f6c6c;font-size:12px;">
            © ${new Date().getFullYear()} Asere. Todos los derechos reservados.
          </td>
        </tr>
      </table>
    </div>
  `;

  // --- Lógica de envío y manejo de errores ---
  try {
    MailApp.sendEmail({
      to: destinatario,
      subject: asunto,
      htmlBody: mensajeHTML
    });

    Logger.log(`✅ Orden de pedido de Asere enviada con éxito a: ${destinatario}`);
    // Devuelve una respuesta JSON al backend indicando éxito
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Orden de pedido enviada con éxito a Google Apps Script." })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`❌ Error al enviar la orden de pedido de Asere a ${destinatario}: ${error.message}`);
    // Devuelve una respuesta JSON al backend indicando error
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: `Error al enviar el correo: ${error.message}` })).setMimeType(ContentService.MimeType.JSON);
  }
}