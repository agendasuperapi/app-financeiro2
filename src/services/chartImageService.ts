import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Tipos de imagens disponíveis
export type ChartImageType = 
  | 'grafico_barras'           // Gráfico de barras (receitas vs despesas)
  | 'grafico_pizza'            // Gráfico de pizza (categorias)
  | 'resumo_mensal'            // Resumo do mês
  | 'evolucao_saldo'           // Evolução do saldo
  | 'top_categorias';          // Top categorias

export interface ChartImage {
  id: string;
  user_id: string;
  nome_imagem: string;
  descricao: string;
  image_url: string;
  mes_referencia: string;
  updated_at: string;
}

// Captura elemento HTML como imagem
export const captureChartAsImage = async (elementId: string): Promise<Blob | null> => {
  try {
    console.log(`🔍 Looking for element: ${elementId}`);
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`❌ Element with id "${elementId}" not found`);
      console.log('📋 Available elements with IDs:', 
        Array.from(document.querySelectorAll('[id]')).map(el => el.id)
      );
      return null;
    }
    
    console.log(`✅ Element found: ${elementId}, capturing...`);
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Maior qualidade
      logging: false,
    });
    
    console.log(`✅ Canvas created for ${elementId}`);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        console.log(`✅ Blob created for ${elementId}, size: ${blob?.size} bytes`);
        resolve(blob);
      }, 'image/png', 0.9);
    });
  } catch (error) {
    console.error('❌ Error capturing chart as image:', error);
    return null;
  }
};

// Upload para Supabase Storage (sobrescreve se existir)
export const uploadChartImage = async (
  userId: string, 
  imageType: ChartImageType, 
  imageBlob: Blob
): Promise<string | null> => {
  try {
    const filePath = `${userId}/${imageType}.png`;
    
    const { data, error } = await supabase.storage
      .from('transaction-charts')
      .upload(filePath, imageBlob, {
        upsert: true, // Sobrescreve se existir
        contentType: 'image/png',
        cacheControl: '3600',
      });
      
    if (error) {
      console.error('Error uploading chart image:', error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('transaction-charts')
      .getPublicUrl(filePath);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadChartImage:', error);
    return null;
  }
};

// Salva/atualiza referência no banco
export const saveChartImageReference = async (
  userId: string,
  nomeImagem: ChartImageType,
  imageUrl: string,
  mesReferencia: string,
  descricao?: string
): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('tbl_imagemtransacao')
      .upsert({
        user_id: userId,
        nome_imagem: nomeImagem,
        image_url: imageUrl,
        mes_referencia: mesReferencia,
        descricao: descricao || getDefaultDescription(nomeImagem),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,nome_imagem'
      });
      
    if (error) {
      console.error('Error saving chart image reference:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveChartImageReference:', error);
    return false;
  }
};

// Descrições padrão
const getDefaultDescription = (type: ChartImageType): string => {
  const descriptions: Record<ChartImageType, string> = {
    grafico_barras: 'Gráfico de barras: Receitas vs Despesas',
    grafico_pizza: 'Gráfico de pizza: Categorias de despesas',
    resumo_mensal: 'Resumo financeiro do mês',
    evolucao_saldo: 'Evolução do saldo ao longo do tempo',
    top_categorias: 'Top categorias de gastos'
  };
  return descriptions[type];
};

// Função principal: captura e salva
export const captureAndSaveChart = async (
  elementId: string,
  imageType: ChartImageType,
  currentMonth: Date
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return false;
    }
    
    const mesReferencia = format(currentMonth, 'yyyy-MM');
    
    console.log(`📸 Capturing chart: ${imageType} for ${mesReferencia}`);
    
    const blob = await captureChartAsImage(elementId);
    if (!blob) {
      console.error('Failed to capture chart as blob');
      return false;
    }
    
    const imageUrl = await uploadChartImage(user.id, imageType, blob);
    if (!imageUrl) {
      console.error('Failed to upload chart image');
      return false;
    }
    
    const success = await saveChartImageReference(user.id, imageType, imageUrl, mesReferencia);
    
    if (success) {
      console.log(`✅ Chart saved successfully: ${imageType}`);
    }
    
    return success;
  } catch (error) {
    console.error('Error in captureAndSaveChart:', error);
    return false;
  }
};
