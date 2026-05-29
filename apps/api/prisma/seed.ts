import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const shouldReset = process.argv.includes('--reset');

  if (shouldReset) {
    console.log('Cleaning existing data...');
    await prisma.payment.deleteMany();
    await prisma.invoiceLineItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.dispatch.deleteMany();
    await prisma.recurringBooking.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.customerAddress.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.territoryService.deleteMany();
    await prisma.territory.deleteMany();
    await prisma.intakeField.deleteMany();
    await prisma.serviceModifier.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceCategory.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.aiResponse.deleteMany();
    await prisma.aiMessage.deleteMany();
    await prisma.aiConversation.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.webhook.deleteMany();
    await prisma.paymentSettings.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    console.log('Cleanup complete.');
  }

  const passwordHash = await bcryptjs.hash('password123', 10);

  const tenant = await prisma.tenant.create({
    data: { name: 'Demo Services', slug: 'demo' },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Adebayo',
      lastName: 'Ogunlesi',
      phone: '+2348012345001',
      role: 'OWNER',
      tenantId: tenant.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      passwordHash,
      firstName: 'Chioma',
      lastName: 'Nwosu',
      phone: '+2348012345002',
      role: 'MANAGER',
      tenantId: tenant.id,
    },
  });

  const tech = await prisma.user.create({
    data: {
      email: 'tech@demo.com',
      passwordHash,
      firstName: 'Emeka',
      lastName: 'Okoro',
      phone: '+2348012345003',
      role: 'TECHNICIAN',
      tenantId: tenant.id,
    },
  });

  const cleaningCat = await prisma.serviceCategory.create({
    data: { name: 'Cleaning', sortOrder: 1, tenantId: tenant.id },
  });

  const plumbingCat = await prisma.serviceCategory.create({
    data: { name: 'Plumbing', sortOrder: 2, tenantId: tenant.id },
  });

  const electricalCat = await prisma.serviceCategory.create({
    data: { name: 'Electrical', sortOrder: 3, tenantId: tenant.id },
  });

  const deepClean = await prisma.service.create({
    data: {
      name: 'Deep Cleaning',
      description: 'Thorough cleaning of entire home including all rooms, windows, and surfaces',
      duration: 120,
      price: 15000,
      tenantId: tenant.id,
      categoryId: cleaningCat.id,
      modifiers: {
        create: [
          { name: 'Fridge Cleaning', price: 3000 },
          { name: 'Oven Cleaning', price: 4000 },
          { name: 'Balcony Cleaning', price: 2500 },
        ],
      },
      intakeFields: {
        create: [
          { label: 'Number of bedrooms', type: 'number', required: true, sortOrder: 1 },
          { label: 'Number of bathrooms', type: 'number', required: true, sortOrder: 2 },
          { label: 'Cleaning supplies provided?', type: 'boolean', required: false, sortOrder: 3 },
        ],
      },
    },
  });

  const stdCleaning = await prisma.service.create({
    data: {
      name: 'Standard Cleaning',
      description: 'Regular home cleaning service covering floors, dusting, and general tidying',
      duration: 60,
      price: 8000,
      tenantId: tenant.id,
      categoryId: cleaningCat.id,
    },
  });

  const pipeRepair = await prisma.service.create({
    data: {
      name: 'Pipe Repair',
      description: 'Fix leaking or burst pipes including assessment and replacement',
      duration: 60,
      price: 8000,
      tenantId: tenant.id,
      categoryId: plumbingCat.id,
      modifiers: {
        create: [
          { name: 'Pipe Replacement', price: 5000 },
          { name: 'Emergency Callout', price: 3000 },
        ],
      },
    },
  });

  const drainCleaning = await prisma.service.create({
    data: {
      name: 'Drain Cleaning',
      description: 'Unblock and clean clogged drains and sewer lines',
      duration: 45,
      price: 6000,
      tenantId: tenant.id,
      categoryId: plumbingCat.id,
    },
  });

  const wiring = await prisma.service.create({
    data: {
      name: 'Electrical Wiring',
      description: 'Full or partial electrical wiring installation and rewiring',
      duration: 180,
      price: 25000,
      tenantId: tenant.id,
      categoryId: electricalCat.id,
      intakeFields: {
        create: [
          { label: 'Number of rooms to wire', type: 'number', required: true, sortOrder: 1 },
          { label: 'Existing wiring present?', type: 'boolean', required: false, sortOrder: 2 },
        ],
      },
    },
  });

  const lightFixture = await prisma.service.create({
    data: {
      name: 'Light Fixture Installation',
      description: 'Install new light fixtures, ceiling fans, and chandeliers',
      duration: 30,
      price: 5000,
      tenantId: tenant.id,
      categoryId: electricalCat.id,
      modifiers: {
        create: [
          { name: 'Chandelier Installation', price: 5000 },
          { name: 'Ceiling Fan Installation', price: 4000 },
          { name: 'Dimmer Switch', price: 2000 },
        ],
      },
    },
  });

  const mainland = await prisma.territory.create({
    data: {
      name: 'Lagos Mainland',
      tenantId: tenant.id,
      territoryServices: {
        create: [
          { serviceId: deepClean.id, price: 15000 },
          { serviceId: stdCleaning.id, price: 8000 },
          { serviceId: pipeRepair.id, price: 8000 },
          { serviceId: drainCleaning.id, price: 6000 },
          { serviceId: wiring.id, price: 25000 },
          { serviceId: lightFixture.id, price: 5000 },
        ],
      },
    },
  });

  const island = await prisma.territory.create({
    data: {
      name: 'Lagos Island',
      tenantId: tenant.id,
      territoryServices: {
        create: [
          { serviceId: deepClean.id, price: 18000 },
          { serviceId: stdCleaning.id, price: 10000 },
          { serviceId: pipeRepair.id, price: 10000 },
          { serviceId: drainCleaning.id, price: 7500 },
          { serviceId: wiring.id, price: 30000 },
          { serviceId: lightFixture.id, price: 7000 },
        ],
      },
    },
  });

  const customer1 = await prisma.customer.create({
    data: {
      firstName: 'Chidi',
      lastName: 'Okonkwo',
      email: 'chidi.okonkwo@email.com',
      phone: '+2348023456001',
      tenantId: tenant.id,
      addresses: {
        create: [{
          label: 'Home',
          street: '42 Adeola Odeku Street',
          city: 'Victoria Island',
          state: 'Lagos',
          isDefault: true,
        }],
      },
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      firstName: 'Amina',
      lastName: 'Bello',
      email: 'amina.bello@email.com',
      phone: '+2348023456002',
      tenantId: tenant.id,
      addresses: {
        create: [{
          label: 'Home',
          street: '15 Bishop Aboyade Cole Street',
          city: 'Ikeja',
          state: 'Lagos',
          isDefault: true,
        }],
      },
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      firstName: 'Femi',
      lastName: 'Adebayo',
      email: 'femi.adebayo@email.com',
      phone: '+2348023456003',
      tenantId: tenant.id,
      addresses: {
        create: [{
          label: 'Office',
          street: '7a Karimu Kotun Street',
          city: 'Victoria Island',
          state: 'Lagos',
          isDefault: true,
        }],
      },
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      firstName: 'Ngozi',
      lastName: 'Eze',
      email: 'ngozi.eze@email.com',
      phone: '+2348023456004',
      tenantId: tenant.id,
      addresses: {
        create: [
          { label: 'Home', street: '23 Admiralty Way', city: 'Lekki', state: 'Lagos', isDefault: true },
          { label: 'Office', street: '10 Plot 8, GRA', city: 'Ikeja', state: 'Lagos' },
        ],
      },
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      firstName: 'Kunle',
      lastName: 'Abimbola',
      email: 'kunle.abimbola@email.com',
      phone: '+2348023456005',
      tenantId: tenant.id,
      addresses: {
        create: [{
          label: 'Home',
          street: '5 Akin Adesola Street',
          city: 'Surulere',
          state: 'Lagos',
          isDefault: true,
        }],
      },
    },
  });

  const now = new Date();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const pendingEnd = new Date(tomorrow);
  pendingEnd.setHours(12, 0, 0, 0);

  const pendingBooking = await prisma.booking.create({
    data: {
      startTime: tomorrow,
      endTime: pendingEnd,
      status: 'PENDING',
      totalPrice: 15000,
      tenantId: tenant.id,
      customerId: customer1.id,
      serviceId: deepClean.id,
    },
  });

  const confirmedStart = new Date(tomorrow);
  confirmedStart.setHours(14, 0, 0, 0);

  const confirmedEnd = new Date(confirmedStart);
  confirmedEnd.setHours(15, 0, 0, 0);

  const confirmedBooking = await prisma.booking.create({
    data: {
      startTime: confirmedStart,
      endTime: confirmedEnd,
      status: 'CONFIRMED',
      totalPrice: 8000,
      notes: 'Customer confirmed via SMS',
      tenantId: tenant.id,
      customerId: customer2.id,
      serviceId: pipeRepair.id,
      technicianId: tech.id,
    },
  });

  const inProgressStart = new Date(now);
  inProgressStart.setHours(14, 0, 0, 0);

  const inProgressEnd = new Date(inProgressStart);
  inProgressEnd.setHours(15, 0, 0, 0);

  const inProgressBooking = await prisma.booking.create({
    data: {
      startTime: inProgressStart,
      endTime: inProgressEnd,
      status: 'IN_PROGRESS',
      totalPrice: 5000,
      tenantId: tenant.id,
      customerId: customer3.id,
      serviceId: lightFixture.id,
      technicianId: tech.id,
    },
  });

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(9, 0, 0, 0);

  const completedEnd = new Date(yesterday);
  completedEnd.setHours(10, 0, 0, 0);

  const completedBooking = await prisma.booking.create({
    data: {
      startTime: yesterday,
      endTime: completedEnd,
      status: 'COMPLETED',
      totalPrice: 8000,
      tenantId: tenant.id,
      customerId: customer4.id,
      serviceId: stdCleaning.id,
      technicianId: tech.id,
    },
  });

  const cancelledStart = new Date(now);
  cancelledStart.setDate(cancelledStart.getDate() - 3);
  cancelledStart.setHours(11, 0, 0, 0);

  const cancelledEnd = new Date(cancelledStart);
  cancelledEnd.setHours(11, 45, 0, 0);

  await prisma.booking.create({
    data: {
      startTime: cancelledStart,
      endTime: cancelledEnd,
      status: 'CANCELLED',
      totalPrice: 6000,
      notes: 'Customer requested cancellation due to rescheduling conflict',
      tenantId: tenant.id,
      customerId: customer5.id,
      serviceId: drainCleaning.id,
    },
  });

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 7);

  const paidInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-001',
      status: 'PAID',
      subtotal: 8000,
      tax: 0,
      total: 8000,
      dueDate: yesterday,
      paidAt: yesterday,
      tenantId: tenant.id,
      customerId: customer4.id,
      bookingId: completedBooking.id,
      lineItems: {
        create: [{
          description: 'Standard Cleaning',
          quantity: 1,
          unitPrice: 8000,
          total: 8000,
        }],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-002',
      status: 'SENT',
      subtotal: 8000,
      tax: 0,
      total: 8000,
      dueDate,
      tenantId: tenant.id,
      customerId: customer2.id,
      bookingId: confirmedBooking.id,
      lineItems: {
        create: [{
          description: 'Pipe Repair',
          quantity: 1,
          unitPrice: 8000,
          total: 8000,
        }],
      },
    },
  });

  await prisma.payment.create({
    data: {
      amount: 8000,
      currency: 'NGN',
      status: 'SUCCESS',
      provider: 'PAYSTACK',
      providerRef: 'paystack_ref_' + Date.now(),
      invoiceId: paidInvoice.id,
    },
  });

  await prisma.aiResponse.create({
    data: {
      trigger: 'greeting',
      response: 'Hello! Welcome to BookerMap. How can I help you with your booking today? You can ask me about available services, schedule a booking, or check the status of an existing appointment.',
      tenantId: tenant.id,
    },
  });

  await prisma.aiResponse.create({
    data: {
      trigger: 'booking_status',
      response: 'Let me look up your booking. Could you please provide your booking reference number or the email address you used when making the reservation?',
      tenantId: tenant.id,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      maxUses: 100,
      usedCount: 5,
      minAmount: 5000,
      expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      tenantId: tenant.id,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'SAVE20',
      type: 'percentage',
      value: 20,
      maxUses: 50,
      usedCount: 12,
      minAmount: 10000,
      expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      tenantId: tenant.id,
    },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
