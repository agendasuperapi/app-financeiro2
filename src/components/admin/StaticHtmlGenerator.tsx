import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client'

interface GenerationResult {
  success: boolean
  data?: {
    company_name: string
    company_description: string
    company_logo: string
    html_content: string
    instructions: {
      step1: string
      step2: string
      step3: string
      step4: string
    }
  }
  error?: string
}

export const StaticHtmlGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [copied, setCopied] = useState(false)

  const generateStaticHtml = async () => {
    setIsGenerating(true)
    setResult(null)
    setCopied(false)

    try {
      console.log('[STATIC-HTML] Chamando função generate-html...')

      // Chamar a Edge Function (sem autenticação)
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-html`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `Erro HTTP: ${response.status}`)
      }

      setResult(data)
      
      if (data.success) {
        console.log('[STATIC-HTML] HTML gerado com sucesso para:', data.data.company_name)
      }

    } catch (error) {
      console.error('[STATIC-HTML] Erro:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (result?.data?.html_content) {
      try {
        await navigator.clipboard.writeText(result.data.html_content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Erro ao copiar:', err)
      }
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📄 Gerador de HTML Estático
        </CardTitle>
        <CardDescription>
          Gera um arquivo index.html otimizado com suas meta tags dinâmicas.
          Ideal para WhatsApp e redes sociais com UTF-8 corrigido.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Botão de Geração */}
        <Button 
          onClick={generateStaticHtml}
          disabled={isGenerating}
          className="flex items-center gap-2"
          size="lg"
        >
          {isGenerating ? '⏳ Gerando HTML...' : '🚀 Gerar HTML Otimizado'}
        </Button>

        {/* Resultado */}
        {result && (
          <div className="space-y-4">
            {result.success ? (
              <Alert className="border-green-200 bg-green-50">
                <div className="space-y-4">
                  <AlertDescription className="font-medium text-green-800">
                    ✅ HTML gerado com sucesso!
                  </AlertDescription>
                  
                  {result.data && (
                    <div className="space-y-4">
                      {/* Informações da Empresa */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Nome:</span> {result.data.company_name}
                        </div>
                        <div>
                          <span className="font-medium">Descrição:</span> {result.data.company_description}
                        </div>
                      </div>
                      
                      {/* Instruções Passo a Passo */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">📋 Como aplicar:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                          <li>{result.data.instructions.step1}</li>
                          <li>{result.data.instructions.step2}</li>
                          <li>{result.data.instructions.step3}</li>
                          <li>{result.data.instructions.step4}</li>
                        </ol>
                      </div>
                      
                      {/* Botão Copiar HTML */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          onClick={copyToClipboard}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          {copied ? '✅ Copiado!' : '📋 Copiar HTML'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          asChild
                          className="flex items-center gap-2"
                        >
                          <a 
                            href="https://github.com/guigascruz25/poupeja-distribuicao-v2/edit/main/index.html" 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            🔗 Editar no GitHub
                          </a>
                        </Button>
                      </div>
                      
                      {/* HTML Code Preview */}
                      <details className="text-sm">
                        <summary className="font-medium cursor-pointer hover:text-blue-600 p-2 bg-gray-50 rounded">
                          👁️ Ver HTML Completo (clique para expandir)
                        </summary>
                        <div className="mt-2 relative">
                          <pre className="p-4 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto max-h-96 border">
                            <code>{result.data.html_content}</code>
                          </pre>
                          <Button
                            onClick={copyToClipboard}
                            size="sm"
                            variant="secondary"
                            className="absolute top-2 right-2 text-xs"
                          >
                            {copied ? '✅' : '📋'}
                          </Button>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  ❌ Erro: {result.error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Informações sobre o processo */}
        <div className="text-sm text-gray-600 space-y-2 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900">ℹ️ Informações importantes:</h4>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>UTF-8 corrigido:</strong> Caracteres como "ção" e "já" serão exibidos corretamente</li>
            <li><strong>WhatsApp otimizado:</strong> Meta tags específicas para redes sociais</li>
            <li><strong>SEO-friendly:</strong> Title e description dinâmicos</li>
            <li><strong>Deploy automático:</strong> Vercel/Easypanel detecta mudanças automaticamente</li>
          </ul>
          
          <div className="mt-3 pt-2 border-t border-blue-200">
            <span className="font-medium text-blue-900">💡 Dica:</span> Execute sempre que alterar nome ou descrição da empresa.
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 