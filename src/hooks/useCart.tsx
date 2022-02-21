import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    // Busca os dados do localStorage.
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    // Retorna os dados no formato de Array de produtos.
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  // Adiciona um produto ao carrinho. Verificando os requisitos:
  // - O valor atualizado do carrinho deve ser perpetuado no **localStorage** utilizando o método `setItem`.

  // - Caso o produto já exista no carrinho, não deve adicionar o produto repetido,
  // apenas incrementar em 1 unidade a quantidade;

  // - Verificar se existe no estoque a quantidade desejada do produto. Caso contrário,
  // utiliza o método `error` da **react-toastify** com a seguinte mensagem:
  // toast.error('Quantidade solicitada fora de estoque');

  // - Capturar utilizando `trycatch` os erros que ocorrerem ao longo do método e, no catch,
  // utilizar o método `error` da **react-toastify** com a seguinte mensagem:
  // toast.error('Erro na adição do produto');
  const addProduct = async (productId: number) => {
    try {
      // Cria um array a partir do valor que tem no carrinho.  
      const updateCart = [...cart];

      // Verifica se o produto existe no carrinho.
      const productExists = updateCart.find(product => product.id === productId);

      // Rota dos produtos.
      const stock = await api.get(`stock/${productId}`);

      const stockAmount = stock.data.amount;

      // Quantidade de produto atual no carrinho, se existe no carrinho pega o produto, se não retorna 0.
      const currentAmount = productExists ? productExists.amount : 0;

      // Quantidade desejada.
      const amount = currentAmount + 1;

      // Verifica a quantidade no estoque.
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // Verifica se o produto existe.
      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1
        }
        updateCart.push(newProduct);
      }
      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  // Remove um produto.
  const removeProduct = (productId: number) => {
    try {
      const updateCart = [...cart];
      const productIndex = updateCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updateCart.splice(productIndex, 1);
        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updateCart = [...cart];
      const productExists = updateCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);
  return context;
}