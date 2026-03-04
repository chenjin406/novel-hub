import { NextRequest, NextResponse } from 'next/server';
import { getRechargePackages, createOrder, processPaymentSuccess } from '@/lib/payment';
import { getCurrentUser } from '@/lib/auth';

// 获取充值套餐
export async function GET(request: NextRequest) {
  try {
    const packages = getRechargePackages();
    return NextResponse.json({ data: packages });
  } catch (error) {
    console.error('Payment packages error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 创建充值订单
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { packageId, paymentMethod } = await request.json();
    
    if (!packageId) {
      return NextResponse.json(
        { error: '请选择充值套餐' },
        { status: 400 }
      );
    }
    
    const { data, error } = await createOrder(user.id, packageId);
    
    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 处理支付回调
export async function PUT(request: NextRequest) {
  try {
    const { orderId, transactionId, paymentMethod } = await request.json();
    
    if (!orderId || !transactionId || !paymentMethod) {
      return NextResponse.json(
        { error: '参数不完整' },
        { status: 400 }
      );
    }
    
    const { data, error } = await processPaymentSuccess(orderId, transactionId, paymentMethod);
    
    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}