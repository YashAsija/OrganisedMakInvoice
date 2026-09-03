import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Invoice, BusinessProfile } from '../../types';

const pageStyle = {
  padding: 30,
  fontSize: 9,
  fontFamily: 'Helvetica',
  color: '#0f172a',
  backgroundColor: '#ffffff'
};

const headerBarStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  backgroundColor: '#0284c7',
  padding: 12,
  borderRadius: 4,
  color: '#ffffff',
  marginBottom: 20
};

const headerTitleStyle = {
  fontSize: 18,
  fontFamily: 'Helvetica-Bold',
  textTransform: 'uppercase' as const
};

const headerSubStyle = {
  fontSize: 9,
  color: '#e0f2fe'
};

const logoStyle = {
  width: 90,
  height: 35
};

const rowStyle = {
  flexDirection: 'row' as const
};

const col2Style = {
  width: '50%'
};

const cardStyle = {
  backgroundColor: '#f8fafc',
  padding: 10,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  marginBottom: 15
};

const cardTitleStyle = {
  fontSize: 9,
  fontFamily: 'Helvetica-Bold',
  color: '#0284c7',
  marginBottom: 4,
  textTransform: 'uppercase' as const
};

const textBoldStyle = {
  fontFamily: 'Helvetica-Bold'
};

const metaTextStyle = {
  fontSize: 8.5,
  color: '#334155',
  marginBottom: 2
};

const tableStyle = {
  width: '100%',
  marginVertical: 10
};

const tableHeaderStyle = {
  flexDirection: 'row' as const,
  backgroundColor: '#f1f5f9',
  padding: 6,
  borderBottomWidth: 1,
  borderBottomColor: '#cbd5e1'
};

const tableHeaderCellStyle = {
  fontSize: 8,
  fontFamily: 'Helvetica-Bold',
  color: '#475569',
  textTransform: 'uppercase' as const
};

const tableRowStyle = {
  flexDirection: 'row' as const,
  borderBottomWidth: 1,
  borderBottomColor: '#f1f5f9',
  padding: 6,
  alignItems: 'center' as const
};

const tableCellStyle = {
  fontSize: 8.5,
  color: '#334155'
};

const colDescStyle = { width: '45%' };
const colHsnStyle = { width: '15%', textAlign: 'center' as const };
const colQtyStyle = { width: '12%', textAlign: 'center' as const };
const colRateStyle = { width: '14%', textAlign: 'right' as const };
const colAmtStyle = { width: '14%', textAlign: 'right' as const };

const summaryBoxStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'flex-end' as const,
  marginTop: 10
};

const summaryTableStyle = {
  width: '45%'
};

const summaryRowStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  paddingVertical: 3
};

const grandTotalRowStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  paddingVertical: 6,
  backgroundColor: '#0284c7',
  paddingHorizontal: 8,
  borderRadius: 4,
  marginTop: 4,
  color: '#ffffff'
};

const grandTotalTextStyle = {
  fontSize: 11,
  fontFamily: 'Helvetica-Bold',
  color: '#ffffff'
};

const footerStyle = {
  marginTop: 20,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: '#e2e8f0'
};

const signatureBoxStyle = {
  marginTop: 15,
  alignItems: 'flex-end' as const
};

const signatureImageStyle = {
  width: 90,
  height: 35
};

const styles = StyleSheet.create({
  page: pageStyle,
  headerBar: headerBarStyle,
  headerTitle: headerTitleStyle,
  headerSub: headerSubStyle,
  logo: logoStyle,
  row: rowStyle,
  col2: col2Style,
  card: cardStyle,
  cardTitle: cardTitleStyle,
  textBold: textBoldStyle,
  metaText: metaTextStyle,
  table: tableStyle,
  tableHeader: tableHeaderStyle,
  tableHeaderCell: tableHeaderCellStyle,
  tableRow: tableRowStyle,
  tableCell: tableCellStyle,
  colDesc: colDescStyle,
  colHsn: colHsnStyle,
  colQty: colQtyStyle,
  colRate: colRateStyle,
  colAmt: colAmtStyle,
  summaryBox: summaryBoxStyle,
  summaryTable: summaryTableStyle,
  summaryRow: summaryRowStyle,
  grandTotalRow: grandTotalRowStyle,
  grandTotalText: grandTotalTextStyle,
  footer: footerStyle,
  signatureBox: signatureBoxStyle,
  signatureImage: signatureImageStyle
});

interface PDFProps {
  invoice: Invoice;
  profile?: BusinessProfile;
  logo?: string | null;
  signature?: string | null;
}

export const ModernPDFTemplate: React.FC<PDFProps> = ({ invoice, profile, logo, signature }) => {
  const sym = profile?.currency === 'INR' ? 'Rs.' : (profile?.currency === 'GBP' ? 'GBP ' : '$');
  const items = invoice.items || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>{invoice.invoiceType?.replace(/_/g, ' ') || 'TAX INVOICE'}</Text>
            <Text style={styles.headerSub}>#{invoice.invoiceNumber}</Text>
          </View>
          {logo ? (
            <Image src={logo} style={styles.logo} />
          ) : (
            <Text style={[styles.headerTitle, { fontSize: 13 }]}>{profile?.name || 'MY BUSINESS'}</Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.col2, { paddingRight: 6 }]}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Client Details</Text>
              <Text style={[styles.metaText, styles.textBold]}>{invoice.clientName || 'Client'}</Text>
              {Boolean(invoice.clientAddress) && <Text style={styles.metaText}>{invoice.clientAddress}</Text>}
              {Boolean(invoice.clientPhone) && <Text style={styles.metaText}>Phone: {invoice.clientPhone}</Text>}
              {Boolean(invoice.clientGstin) && <Text style={styles.metaText}>GSTIN: {invoice.clientGstin}</Text>}
            </View>
          </View>

          <View style={[styles.col2, { paddingLeft: 6 }]}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Invoice Info</Text>
              <Text style={styles.metaText}>Date: {invoice.date}</Text>
              <Text style={styles.metaText}>Due Date: {invoice.dueDate}</Text>
              {Boolean(invoice.poNumber) && <Text style={styles.metaText}>P.O. No: {invoice.poNumber}</Text>}
              {Boolean(invoice.deliveryNote) && <Text style={styles.metaText}>Delivery Note: {invoice.deliveryNote}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colHsn]}>HSN/SAC</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmt]}>Amount</Text>
          </View>
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colDesc, styles.textBold]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.colHsn]}>{(item as any).hsn || (item as any).hsnSac || '-'}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colRate]}>{sym}{item.rate.toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.colAmt, styles.textBold]}>{sym}{(item.quantity * item.rate).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.metaText}>Subtotal:</Text>
              <Text style={[styles.metaText, styles.textBold]}>{sym}{(invoice.subtotal || 0).toFixed(2)}</Text>
            </View>
            {Boolean(invoice.discountTotal) && (
              <View style={styles.summaryRow}>
                <Text style={styles.metaText}>Discount:</Text>
                <Text style={styles.metaText}>-{sym}{(invoice.discountTotal || 0).toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.metaText}>Tax Total:</Text>
              <Text style={[styles.metaText, styles.textBold]}>{sym}{(invoice.taxTotal || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalText}>Total Amount:</Text>
              <Text style={styles.grandTotalText}>{sym}{(invoice.grandTotal || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {Boolean(invoice.notes) && (
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.cardTitle, { color: '#475569' }]}>Terms & Notes</Text>
              <Text style={styles.metaText}>{invoice.notes}</Text>
            </View>
          )}

          {signature && (
            <View style={styles.signatureBox}>
              <Image src={signature} style={styles.signatureImage} />
              <Text style={[styles.metaText, { marginTop: 4 }]}>Authorized Signature</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};
