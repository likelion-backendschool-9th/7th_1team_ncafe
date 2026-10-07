import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

import javax.swing.JFrame;
import javax.swing.JOptionPane;

public class App extends MouseAdapter {
    public static void main(String[] args) {
        JFrame frame = new JFrame();
        frame.setSize(500,400);
        frame.addMouseListener(new MouseHandler(frame));
        frame.setVisible(true);
    }

    @Override
    public void mouseClicked(MouseEvent e) {
        System.out.println("haha");
        JOptionPane.showMessageDialog(parent, "haha");
    }

    
}
