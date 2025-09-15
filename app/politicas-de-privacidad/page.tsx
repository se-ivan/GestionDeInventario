import { ArrowLeft, Shield, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PoliticasPrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-gray-600" />
            <h1 className="text-xl font-semibold text-gray-900">Política de Privacidad</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-12 px-4">
        <div className="prose prose-gray max-w-none">
          {/* Title and Date */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 text-balance">
              Política de Privacidad para Notificaciones Internas
            </h1>
            <p className="text-lg text-gray-600 mb-2">(API de WhatsApp) de El Colegio Invisible</p>
            <p className="text-sm text-gray-500 bg-gray-50 inline-block px-4 py-2 rounded-lg">
              Fecha de entrada en vigor: 14 de septiembre de 2025
            </p>
          </div>

          {/* Section 1 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                1
              </span>
              Introducción
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 leading-relaxed mb-4">
                Bienvenido a El Colegio Invisible. La presente Política de Privacidad describe cómo gestionamos la
                información para el envío de notificaciones internas de ventas a nuestro propio número de teléfono
                utilizando la Plataforma de WhatsApp Business (API).
              </p>
              <p className="text-gray-700 leading-relaxed">
                El objetivo de esta política es cumplir con los requisitos de transparencia de Meta (empresa matriz de
                WhatsApp) y aclarar el alcance y la finalidad de nuestro uso de su servicio.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span>
              Alcance de esta Política
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Esta política se aplica exclusiva y únicamente al sistema automatizado que envía un mensaje a un número de
              teléfono propiedad de la administración de El Colegio Invisible cada vez que se realiza una venta.
            </p>
            <div className="bg-red-50 border-l-4 border-red-200 p-4 rounded-r-lg">
              <p className="font-semibold text-gray-900 mb-2">Esta política no cubre:</p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                  La recopilación de datos de clientes en nuestro sitio web o punto de venta.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                  Comunicaciones de marketing o de cualquier otro tipo dirigidas a clientes.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                  Cualquier otro procesamiento de datos fuera del sistema de notificación de ventas.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </span>
              Información que Procesamos
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Para generar la notificación de venta, nuestro sistema procesa la siguiente información transaccional:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Confirmación de venta:</h4>
                <p className="text-gray-700 text-sm">Un aviso de que se ha completado un pedido.</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Detalles del pedido:</h4>
                <p className="text-gray-700 text-sm">
                  Número de orden, títulos de los libros vendidos y el monto total de la compra.
                </p>
              </div>
            </div>
            <div className="bg-green-50 border-l-4 border-green-200 p-4 rounded-r-lg">
              <p className="text-gray-700 leading-relaxed">
                <strong>Es fundamental destacar que</strong> ningún dato personal del cliente (como su nombre, número de
                teléfono, dirección o información de pago) se incluye o transmite en estos mensajes de notificación por
                WhatsApp. El mensaje es una alerta interna y anónima respecto al cliente.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                4
              </span>
              Finalidad del Uso de la Información
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              La información mencionada en el punto anterior se utiliza con un único propósito:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 leading-relaxed">
                Notificar al personal de El Colegio Invisible sobre una nueva venta en tiempo real. Esto nos permite
                agilizar de manera inmediata el proceso de preparación y envío del pedido, mejorando así nuestra
                eficiencia operativa.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                5
              </span>
              Uso de la API de WhatsApp
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Utilizamos la API de la Plataforma de WhatsApp Business como un canal para enviar las notificaciones
              descritas anteriormente a un único número de teléfono, el cual es propiedad y está operado por la
              dirección de El Colegio Invisible.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-200 p-4 rounded-r-lg">
              <p className="text-gray-700 leading-relaxed">
                No enviamos mensajes a clientes ni a ningún otro número que no sea el nuestro a través de este sistema.
                La comunicación es unidireccional y de carácter puramente interno.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                6
              </span>
              Seguridad y Almacenamiento
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Las credenciales de acceso a la API de WhatsApp están protegidas para evitar su uso no autorizado. Los
              mensajes de notificación quedan almacenados en el dispositivo receptor propiedad de la librería, cuyo
              acceso está restringido al personal autorizado.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                7
              </span>
              No Divulgación a Terceros
            </h2>
            <p className="text-gray-700 leading-relaxed">
              La información de las ventas procesada para estas notificaciones no se comparte con ninguna entidad o
              tercero. El único tercero involucrado es Meta/WhatsApp, que actúa como el procesador de datos para la
              entrega del mensaje, sujeto a sus propias políticas de privacidad y condiciones de servicio.
            </p>
          </section>

          {/* Section 8 - Contact */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                8
              </span>
              Contacto
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Si tienes alguna pregunta sobre esta política específica, puedes contactarnos a través de:
            </p>
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">Correo electrónico:</p>
                  <a
                    href="mailto:despachojuridicoapitest@gmail.com"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    despachojuridicoapitest@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8 px-4 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600 text-sm">© 2025 El Colegio Invisible. Todos los derechos reservados.</p>
          <p className="text-gray-500 text-xs mt-2">
            Esta política de privacidad es específica para el sistema de notificaciones internas de WhatsApp.
          </p>
        </div>
      </footer>
    </div>
  )
}