import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartCopy = [...cart];
      const productInCart = cartCopy.find((p) => p.id === productId);

      const {
        data: { amount: productStock },
      } = await api.get(`/stock/${productId}`);

      const currentAmount = productInCart ? productInCart.amount : 0;
      const newAmount = currentAmount + 1;

      if (newAmount > productStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productInCart) {
        productInCart.amount = newAmount;
        setCart(cartCopy);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartCopy));
      } else {
        const { data: product } = await api.get(`/products/${productId}`);

        cartCopy.push({ ...product, amount: 1 });
        setCart(cartCopy);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartCopy));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartCopy = [...cart];
      const productIndex = cartCopy.findIndex((p) => p.id === productId);

      if (productIndex >= 0) {
        cartCopy.splice(productIndex, 1);

        setCart(cartCopy);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartCopy));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
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

      const {
        data: { amount: productStock },
      } = await api.get(`/stock/${productId}`);
      if (amount > productStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const cartCopy = [...cart];
      const product = cart.find((p) => p.id === productId);

      if (product) {
        product.amount = amount;
        setCart(cartCopy);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartCopy));
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
